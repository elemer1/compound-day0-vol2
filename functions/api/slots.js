// GET /api/slots — live remaining capacity per slot (no auth).
export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT s.id, s.time_label, s.end_label, s.capacity,
              (SELECT COUNT(*) FROM bookings b WHERE b.slot_id = s.id) AS booked
       FROM slots s
       ORDER BY s.sort_order`
    ).all();

    const slots = results.map((r) => ({
      id: r.id,
      time: r.time_label,
      end: r.end_label,
      capacity: r.capacity,
      remaining: Math.max(0, r.capacity - r.booked),
    }));

    return json({ slots }, 200, { "Cache-Control": "no-store" });
  } catch (err) {
    return json({ error: "server_error", message: String(err) }, 500);
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
  });
}
