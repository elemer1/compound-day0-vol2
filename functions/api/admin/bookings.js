// GET /api/admin/bookings — full list + per-slot fill + totals (Basic-Auth via _middleware).
export async function onRequestGet({ env }) {
  try {
    const slotsQ = await env.DB.prepare(
      `SELECT s.id, s.time_label, s.end_label, s.capacity, s.sort_order,
              (SELECT COUNT(*) FROM bookings b WHERE b.slot_id = s.id) AS booked
       FROM slots s ORDER BY s.sort_order`
    ).all();

    const bookingsQ = await env.DB.prepare(
      `SELECT b.id, b.ref_code, b.name, b.birth_year, b.birth_month, b.gender,
              b.slot_id, s.time_label, s.end_label, b.email, b.phone, b.created_at,
              b.consent_service, b.consent_privacy, b.consent_health, b.consent_version, b.consent_ip
       FROM bookings b JOIN slots s ON s.id = b.slot_id
       ORDER BY s.sort_order ASC, b.created_at ASC`
    ).all();

    const slots = slotsQ.results.map((r) => ({
      id: r.id, time: r.time_label, end: r.end_label,
      capacity: r.capacity, booked: r.booked, remaining: Math.max(0, r.capacity - r.booked),
    }));
    const totalCapacity = slots.reduce((a, s) => a + s.capacity, 0);
    const totalBooked = slots.reduce((a, s) => a + s.booked, 0);

    const bookings = bookingsQ.results.map((r) => ({
      id: r.id, ref: r.ref_code, name: r.name,
      birth: `${r.birth_year}-${String(r.birth_month).padStart(2, "0")}`,
      gender: r.gender, slotId: r.slot_id, slot: `${r.time_label}–${r.end_label}`,
      email: r.email, phone: r.phone, createdAt: r.created_at,
      consent: {
        all: !!(r.consent_service && r.consent_privacy && r.consent_health),
        service: !!r.consent_service, privacy: !!r.consent_privacy, health: !!r.consent_health,
        version: r.consent_version || "", ip: r.consent_ip || "",
      },
    }));

    return json({ slots, bookings, totals: { capacity: totalCapacity, booked: totalBooked } });
  } catch (err) {
    return json({ error: "server_error", message: String(err) }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
