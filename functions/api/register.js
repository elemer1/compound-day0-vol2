// POST /api/register — validate, reserve a seat atomically, return confirmation.
// Consent version stamped onto every booking. Bump this if the legal team
// reissues the documents (keep in sync with build_legal.py CONSENT_VERSION).
const CONSENT_VERSION = "2026-05-20";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request", message: "Invalid JSON" }, 400);
  }

  const v = validate(body);
  if (!v.ok) return json({ error: v.code || "validation", field: v.field, message: v.message }, 400);
  const d = v.data;

  const ip = (request.headers.get("CF-Connecting-IP") || "").slice(0, 64);

  try {
    // 1) Slot must exist (also gives us the time labels for the response).
    const slot = await env.DB.prepare(
      "SELECT id, time_label, end_label, capacity FROM slots WHERE id = ?"
    ).bind(d.slotId).first();
    if (!slot) return json({ error: "validation", field: "slot", message: "時段不存在" }, 400);

    // 2) One booking per email — if they already booked, return the existing one.
    const existing = await env.DB.prepare(
      `SELECT b.ref_code, b.name, s.time_label, s.end_label
       FROM bookings b JOIN slots s ON s.id = b.slot_id
       WHERE b.email = ?`
    ).bind(d.email).first();
    if (existing) {
      return json({
        error: "duplicate",
        message: "你已用此電郵預約過",
        booking: {
          ref: existing.ref_code,
          name: existing.name,
          slot: { time: existing.time_label, end: existing.end_label },
        },
      }, 409);
    }

    const ua = (request.headers.get("User-Agent") || "").slice(0, 300);
    const now = new Date().toISOString();

    // 3) Atomic reserve: insert ONLY if the slot still has a free seat.
    //    INSERT ... SELECT ... WHERE (count < capacity) is one statement,
    //    so two racing requests can never both take the last seat.
    let ref = makeRef();
    let inserted = false;
    for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
      try {
        const res = await env.DB.prepare(
          `INSERT INTO bookings
             (ref_code, name, birth_year, birth_month, gender, slot_id, email, phone, created_at, ua,
              consent_service, consent_privacy, consent_health, consent_version, consent_ip)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
           WHERE (SELECT COUNT(*) FROM bookings WHERE slot_id = ?)
                 < (SELECT capacity FROM slots WHERE id = ?)`
        ).bind(
          ref, d.name, d.birthYear, d.birthMonth, d.gender, d.slotId,
          d.email, d.phone, now, ua,
          d.consent.service ? 1 : 0, d.consent.privacy ? 1 : 0, d.consent.health ? 1 : 0, CONSENT_VERSION, ip,
          d.slotId, d.slotId
        ).run();

        if (res.meta.changes === 0) {
          // WHERE was false → no free seat left in this slot.
          return json({ error: "slot_full", message: "該時段剛剛額滿，請改選其他時段" }, 409);
        }
        inserted = true;
      } catch (e) {
        const msg = String(e);
        if (msg.includes("ref_code")) { ref = makeRef(); continue; } // ref collision, retry
        if (msg.includes("email") || msg.includes("UNIQUE")) {
          // Race: same email submitted twice in parallel — surface existing.
          const ex = await env.DB.prepare(
            `SELECT b.ref_code, b.name, s.time_label, s.end_label
             FROM bookings b JOIN slots s ON s.id = b.slot_id WHERE b.email = ?`
          ).bind(d.email).first();
          return json({
            error: "duplicate",
            message: "你已用此電郵預約過",
            booking: ex ? { ref: ex.ref_code, name: ex.name, slot: { time: ex.time_label, end: ex.end_label } } : null,
          }, 409);
        }
        throw e;
      }
    }
    if (!inserted) return json({ error: "server_error", message: "請重試" }, 500);

    return json({
      ok: true,
      ref,
      name: d.name,
      slot: { id: slot.id, time: slot.time_label, end: slot.end_label },
    }, 201);
  } catch (err) {
    return json({ error: "server_error", message: String(err) }, 500);
  }
}

function validate(b) {
  if (!b || typeof b !== "object") return fail(null, "缺少資料");

  const name = str(b.name).trim();
  if (name.length < 1 || name.length > 80) return fail("name", "請填寫姓名");

  const birthYear = int(b.birthYear);
  if (!birthYear || birthYear < 1900 || birthYear > 2025) return fail("birth", "請選擇出生年份");
  const birthMonth = int(b.birthMonth);
  if (!birthMonth || birthMonth < 1 || birthMonth > 12) return fail("birth", "請選擇出生月份");

  const gender = str(b.gender);
  if (gender !== "female" && gender !== "male") return fail("gender", "請選擇生理性別");

  const slotId = str(b.slotId);
  if (!/^s\d{4}$/.test(slotId)) return fail("slot", "請選擇時段");

  const email = str(b.email).trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("email", "請填寫有效電郵地址");

  const phone = str(b.phone).trim();
  const digits = (phone.match(/\d/g) || []).length;
  if (phone.length > 32 || digits < 7 || !/^[+\d][\d\s\-()]*$/.test(phone)) return fail("phone", "請填寫有效電話號碼");

  // All three consents are mandatory — the booking cannot proceed without them.
  const c = b.consent;
  if (!c || c.service !== true || c.privacy !== true || c.health !== true) {
    return { ok: false, field: "consent", code: "consent_required", message: "請閱讀並同意全部三份文件" };
  }

  return { ok: true, data: { name, birthYear, birthMonth, gender, slotId, email: email.toLowerCase(), phone,
    consent: { service: true, privacy: true, health: true } } };
}

const fail = (field, message) => ({ ok: false, field, message });
const str = (x) => (x == null ? "" : String(x));
const int = (x) => { const n = parseInt(x, 10); return Number.isFinite(n) ? n : 0; };

function makeRef() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let s = "";
  for (const x of bytes) s += alphabet[x % alphabet.length];
  return "FT-" + s;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders },
  });
}
