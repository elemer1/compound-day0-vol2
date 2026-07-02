// Shared pricing source of truth for Day 0 vol.2 (2026-07-11) registration.
// Used by /api/register-v2 (authoritative, on submit), /api/quote-v2
// (live full running total), and the legacy /api/tier-check endpoint so
// pricing cannot drift apart. This file lives under functions/_lib — Cloudflare Pages
// Functions bundles it, but it is NOT itself routable as an endpoint.

// Business owner: put real referral codes here before go-live (case-insensitive
// match; codes are trimmed + upper-cased). Anything unrecognized silently falls
// back to the public tier — a mistyped code should never block a registration.
// This map intentionally never ships to the browser (see quote-v2.js) so the
// code list stays confidential.
export const REFERRAL_CODES = {
  "VIP": "vip",
  "COMPOUND-VIP": "vip",
  "DAY0-VIP": "vip",
  "VIPFREE": "vip",
  "VIP推荐": "friend",
  "VIP-推荐": "friend",
  "VIPFRIEND": "friend",
  "VIP-FRIEND": "friend",
  "FRIEND": "friend",
  "内推": "friend",
  "內推": "friend",
  "INTERNAL": "friend",
  "COMPOUND-FRIEND": "friend",
  "DAY0-FRIEND": "friend",
};

export const TIERS = {
  vip: { label: "VIP · 專屬邀請", salon: 0, addon: 0 },
  friend: { label: "同道推薦價", salon: 299, addon: 1700 },
  public: { label: "公開報名價", salon: 599, addon: 2400 },
};

// Resolve a raw (possibly empty/garbage) referral code string to a tier.
// codeRecognized is false only when the guest typed something non-empty that
// didn't match — an empty field is not a "failure," it's just public pricing.
export function resolveTier(rawCode) {
  const normalizedCode = rawCode ? String(rawCode).trim().toUpperCase() : "";
  const codeRecognized = !normalizedCode || !!REFERRAL_CODES[normalizedCode];
  const tier = normalizedCode && REFERRAL_CODES[normalizedCode] ? REFERRAL_CODES[normalizedCode] : "public";
  return { normalizedCode, tier, codeRecognized };
}

// 沙龍席 (event + agent only) vs 會員席 (event + deep biomarker testing + agent
// upgrade) vs "到現場再決定" (undecided — priced as 沙龍席 for now; the business
// follows up in person if the guest upgrades on the day).
export const TICKET_CHOICES = ["salon", "member", "decide_onsite"];

// 8:30–10:00 movement block, single choice (also used for headcount/equipment).
export const WORKOUT_PREFS = ["breathwork", "hiit", "zone2", "none"];

// 會員席-only: which biomarker-draw window they want. Simple preference capture,
// not a capacity-tracked booking (unlike the vol.1 slot system in register.js).
export const TESTING_SLOTS = ["08:30-09:00", "09:00-09:30", "09:30-10:00", "10:30-11:00"];

export function wantsTestingFor(ticketChoice) {
  return ticketChoice === "member";
}

// Single formula shared by /api/register-v2 (authoritative) and /api/quote-v2
// (live estimate) so the two can never disagree. "雙人同行各享 8 折" is applied
// to the whole party whenever at least one companion is along (party of 2 or 3).
export function computeAmount({ tier, ticketChoice, companionCount }) {
  const t = TIERS[tier] || TIERS.public;
  const wantsTesting = wantsTestingFor(ticketChoice);
  const perPerson = t.salon + (wantsTesting ? t.addon : 0);
  const count = Math.max(0, Math.min(2, Number(companionCount) || 0));
  const partySize = 1 + count;
  const discount = count > 0 ? 0.2 : 0;
  const amountDue = Math.round(perPerson * partySize * (1 - discount));
  return { amountDue, wantsTesting, partySize, discount, perPerson };
}
