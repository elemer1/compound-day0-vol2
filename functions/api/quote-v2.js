// POST /api/quote-v2 — Day 0 vol.2 pricing quote for the CURRENT form state.
// This mirrors register-v2.js pricing (via the shared computeAmount() in
// functions/_lib/pricing.js) but does not persist anything. register-v2 remains
// the source of truth for final submitted amounts. Ticket choice is now 3-way
// (salon / member / decide_onsite — see TICKET_CHOICES) and party size can
// include up to two named companions, not just a single on/off toggle.
import { TIERS, resolveTier, computeAmount, TICKET_CHOICES } from "../_lib/pricing.js";

export async function onRequestPost({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request", message: "Invalid JSON" }, 400);
  }

  const quote = computeQuote(body || {});
  return json({ ok: true, ...quote });
}

function computeQuote(body) {
  const rawCode = str(body.referralCode).trim().slice(0, 40);
  const { tier, codeRecognized } = resolveTier(rawCode);
  const t = TIERS[tier];
  const ticketChoice = TICKET_CHOICES.includes(body.ticketChoice) ? body.ticketChoice : "salon";
  const companionCount = Math.max(0, Math.min(2, parseInt(body.companionCount, 10) || 0));

  const { amountDue, wantsTesting, partySize, discount, perPerson } = computeAmount({ tier, ticketChoice, companionCount });

  return {
    tier,
    tierLabel: t.label,
    codeEntered: !!rawCode,
    codeRecognized,
    salon: t.salon,
    addon: t.addon,
    memberTotal: t.salon + t.addon,
    ticketChoice,
    wantsTesting,
    companionCount,
    partySize,
    discount,
    perPerson,
    amountDue,
    currency: "CNY",
  };
}

const str = (x) => (x == null ? "" : String(x));

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
