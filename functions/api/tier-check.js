// GET /api/tier-check?code=XXX — live referral-code → price preview while the
// guest is still typing, WITHOUT shipping the code→tier map to the browser.
// The full map only ever lives server-side (functions/_lib/pricing.js);
// /api/register-v2 remains the authoritative price on actual submission — this
// endpoint exists purely so the page can show an accurate running total before
// that, instead of always assuming public pricing.
import { TIERS, resolveTier } from "../_lib/pricing.js";

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const raw = (url.searchParams.get("code") || "").slice(0, 40);
  const { tier, codeRecognized } = resolveTier(raw);
  const t = TIERS[tier];

  return json({
    ok: true,
    tier,
    tierLabel: t.label,
    codeRecognized,
    salon: t.salon,
    addon: t.addon,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
