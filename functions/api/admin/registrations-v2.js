// GET /api/admin/registrations-v2 — Day 0 vol.2 registrations as JSON (Basic-Auth via _middleware).
export async function onRequestGet({ env }) {
  try {
    const q = await env.DB.prepare(
      `SELECT id, ref_code, name, wechat_id, phone, company_title, referral_code, inviter_name,
              tier, ticket_choice, wants_testing, testing_slot, workout_pref,
              companion_count, companion_name, companion1_wechat, companion2_name, companion2_wechat,
              topic_interest, health_challenge, notes, amount_due, currency, payment_status,
              consent_service, consent_privacy, consent_health, consent_version, consent_ip, created_at
       FROM registrations_v2 ORDER BY created_at ASC`
    ).all();

    const registrations = q.results.map((r) => ({
      id: r.id, ref: r.ref_code, name: r.name, wechatId: r.wechat_id, phone: r.phone || "",
      companyTitle: r.company_title || "", referralCode: r.referral_code || "", inviterName: r.inviter_name || "",
      tier: r.tier, ticketChoice: r.ticket_choice, wantsTesting: !!r.wants_testing, testingSlot: r.testing_slot || "",
      workoutPref: r.workout_pref || "",
      companionCount: r.companion_count || 0,
      companion1: { name: r.companion_name || "", wechat: r.companion1_wechat || "" },
      companion2: { name: r.companion2_name || "", wechat: r.companion2_wechat || "" },
      topicInterest: r.topic_interest || "", healthChallenge: r.health_challenge || "",
      notes: r.notes || "", amountDue: r.amount_due, currency: r.currency, paymentStatus: r.payment_status,
      consent: {
        service: !!r.consent_service, privacy: !!r.consent_privacy, health: !!r.consent_health,
        version: r.consent_version || "", ip: r.consent_ip || "",
      },
      createdAt: r.created_at,
    }));

    const totals = registrations.reduce((acc, r) => {
      acc.count += 1;
      acc.amountDue += r.amountDue;
      acc.byTier[r.tier] = (acc.byTier[r.tier] || 0) + 1;
      return acc;
    }, { count: 0, amountDue: 0, byTier: {} });

    return json({ registrations, totals });
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
