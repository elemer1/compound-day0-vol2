// POST /api/register-v2 — Day 0 vol.2 (2026-07-11) registration.
// WeChat-first intake, no slot booking this round (see register.js for the vol.1
// blood-draw flow). Pricing is computed here, server-side, from the referral code —
// the client only ever *displays* a price (via /api/quote-v2 for a live estimate);
// this function is the final source of truth. See functions/_lib/pricing.js for the
// shared referral-code → tier table and pricing formula (kept out of the browser
// bundle on purpose).
import { TIERS, resolveTier, computeAmount, TICKET_CHOICES, WORKOUT_PREFS, TESTING_SLOTS } from "../_lib/pricing.js";

const CONSENT_VERSION = "2026-07-02";

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
  const ua = (request.headers.get("User-Agent") || "").slice(0, 300);
  const now = new Date().toISOString();

  const { normalizedCode, tier, codeRecognized } = resolveTier(d.referralCode);
  const t = TIERS[tier];
  const { amountDue, wantsTesting } = computeAmount({ tier, ticketChoice: d.ticketChoice, companionCount: d.companionCount });
  const paymentStatus = amountDue === 0 ? "comped" : "pending";

  try {
    // One booking per WeChat ID — if they already registered, return the existing one.
    const existing = await env.DB.prepare(
      `SELECT ref_code, name, tier, ticket_choice, wants_testing, companion_count, amount_due, payment_status
       FROM registrations_v2 WHERE wechat_id = ?`
    ).bind(d.wechatId).first();
    if (existing) {
      return json({ error: "duplicate", message: "此微信號已提交過報名", registration: existingToRegistration(existing) }, 409);
    }

    let ref = makeRef();
    let inserted = false;
    for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
      try {
        await env.DB.prepare(
          `INSERT INTO registrations_v2
             (ref_code, name, wechat_id, phone, company_title, referral_code, inviter_name,
              tier, ticket_choice, wants_testing, testing_slot, workout_pref,
              companion, companion_count, companion_name, companion1_wechat, companion2_name, companion2_wechat,
              topic_interest, health_challenge, notes, amount_due, currency, payment_status,
              consent_service, consent_privacy, consent_health, consent_version,
              consent_ip, created_at, ua)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CNY', ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          ref, d.name, d.wechatId, d.phone || "", d.companyTitle || null, normalizedCode || null, d.inviterName || null,
          tier, d.ticketChoice, wantsTesting ? 1 : 0, d.testingSlot || null, d.workoutPref,
          d.companionCount > 0 ? 1 : 0, d.companionCount,
          d.companion1.name || null, d.companion1.wechat || null, d.companion2.name || null, d.companion2.wechat || null,
          d.topicInterest || null, d.healthChallenge || null, d.notes || null, amountDue, paymentStatus,
          d.consent.service ? 1 : 0, d.consent.privacy ? 1 : 0, d.consent.health ? 1 : 0,
          CONSENT_VERSION, ip, now, ua
        ).run();
        inserted = true;
      } catch (e) {
        const msg = String(e);
        if (msg.includes("ref_code")) { ref = makeRef(); continue; }
        if (msg.includes("wechat_id") || msg.includes("UNIQUE")) {
          const ex = await env.DB.prepare(
            `SELECT ref_code, name, tier, ticket_choice, wants_testing, companion_count, amount_due, payment_status
             FROM registrations_v2 WHERE wechat_id = ?`
          ).bind(d.wechatId).first();
          return json({ error: "duplicate", message: "此微信號已提交過報名", registration: ex ? existingToRegistration(ex) : null }, 409);
        }
        throw e;
      }
    }
    if (!inserted) return json({ error: "server_error", message: "請重試" }, 500);

    return json({
      ok: true,
      ref,
      name: d.name,
      tier,
      tierLabel: t.label,
      codeRecognized,
      ticketChoice: d.ticketChoice,
      wantsTesting,
      testingSlot: d.testingSlot || null,
      companionCount: d.companionCount,
      amountDue,
      currency: "CNY",
      paymentStatus,
    }, 201);
  } catch (err) {
    return json({ error: "server_error", message: String(err) }, 500);
  }
}

function validate(b) {
  if (!b || typeof b !== "object") return fail(null, "缺少資料");

  const name = str(b.name).trim();
  if (name.length < 1 || name.length > 80) return fail("name", "請填寫姓名");

  const wechatId = str(b.wechatId).trim();
  if (wechatId.length < 2 || wechatId.length > 64) return fail("wechatId", "請填寫微信號");

  // "手機 / 郵箱" — a single secondary-contact field, optional, accepts either shape.
  const phone = str(b.phone).trim();
  if (phone) {
    const digits = (phone.match(/\d/g) || []).length;
    const looksLikePhone = phone.length <= 32 && digits >= 7 && /^[+\d][\d\s\-()]*$/.test(phone);
    const looksLikeEmail = phone.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(phone);
    if (!looksLikePhone && !looksLikeEmail) return fail("phone", "請填寫有效的手機號碼或電郵，或留空");
  }

  const companyTitle = str(b.companyTitle).trim().slice(0, 120);
  const referralCode = str(b.referralCode).trim().slice(0, 40);
  const inviterName = str(b.inviterName).trim().slice(0, 80);

  const ticketChoice = TICKET_CHOICES.includes(b.ticketChoice) ? b.ticketChoice : null;
  if (!ticketChoice) return fail("ticketChoice", "請選擇席位");

  let testingSlot = str(b.testingSlot).trim();
  if (ticketChoice === "member") {
    if (!TESTING_SLOTS.includes(testingSlot)) return fail("testingSlot", "請選擇生物標誌物檢測時段");
  } else {
    testingSlot = "";
  }

  const workoutPref = WORKOUT_PREFS.includes(b.workoutPref) ? b.workoutPref : null;
  if (!workoutPref) return fail("workoutPref", "請選擇是否參加運動工作坊");

  const companionCount = Math.max(0, Math.min(2, parseInt(b.companionCount, 10) || 0));
  const c1 = b.companion1 || {};
  const c2 = b.companion2 || {};
  const companion1 = { name: str(c1.name).trim().slice(0, 80), wechat: str(c1.wechat).trim().slice(0, 64) };
  const companion2 = { name: str(c2.name).trim().slice(0, 80), wechat: str(c2.wechat).trim().slice(0, 64) };
  if (companionCount >= 1 && (!companion1.name || !companion1.wechat)) {
    return fail("companion1", "請填寫同行者姓名與微信號");
  }
  if (companionCount >= 2 && (!companion2.name || !companion2.wechat)) {
    return fail("companion2", "請填寫第二位同行者姓名與微信號");
  }

  const topicInterest = str(b.topicInterest).trim().slice(0, 500);
  const healthChallenge = str(b.healthChallenge).trim().slice(0, 500);
  const notes = str(b.notes).trim().slice(0, 500);

  if (ticketChoice === "member" && b.testingAck !== true) {
    return { ok: false, field: "testingAck", code: "testing_ack_required", message: "請先確認已閱讀檢測前須知" };
  }

  const c = b.consent || {};
  if (c.service !== true || c.privacy !== true) {
    return { ok: false, field: "consent", code: "consent_required", message: "請閱讀並同意服務協議與隱私政策" };
  }
  if (ticketChoice === "member" && c.health !== true) {
    return { ok: false, field: "consent", code: "health_consent_required", message: "選擇檢測需另外同意健康知情同意書" };
  }

  return {
    ok: true,
    data: {
      name, wechatId, phone, companyTitle, referralCode, inviterName,
      ticketChoice, testingSlot, workoutPref,
      companionCount, companion1, companion2,
      topicInterest, healthChallenge, notes,
      consent: { service: true, privacy: true, health: ticketChoice === "member" ? true : !!c.health },
    },
  };
}

const fail = (field, message) => ({ ok: false, field, message });
const str = (x) => (x == null ? "" : String(x));

// Shape a stored row into the same registration fields the success (201) response
// returns, so the confirmation screen renders identically whether this is a fresh
// registration or someone re-submitting with a WeChat ID they already used.
function existingToRegistration(row) {
  const tierLabel = (TIERS[row.tier] || TIERS.public).label;
  return {
    ref: row.ref_code,
    name: row.name,
    tier: row.tier,
    tierLabel,
    ticketChoice: row.ticket_choice || (row.wants_testing ? "member" : "salon"),
    wantsTesting: !!row.wants_testing,
    companionCount: row.companion_count || 0,
    amountDue: row.amount_due,
    currency: "CNY",
    paymentStatus: row.payment_status,
  };
}

function makeRef() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let s = "";
  for (const x of bytes) s += alphabet[x % alphabet.length];
  return "D0-" + s;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders },
  });
}
