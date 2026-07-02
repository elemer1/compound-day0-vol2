-- Adds the Day 0 vol.2 (2026-07-11) registration table.
-- (schema.sql already includes this for brand-new databases; this migration is
--  only needed to layer it onto an EXISTING database, e.g. the live vol.1 DB.)
--
-- Purely additive — does not touch `bookings` or `slots` (the vol.1 blood-draw
-- flow keeps working untouched). Safe to re-run: CREATE ... IF NOT EXISTS.
--
--   Local :  npx wrangler d1 execute compound-rsvp-db --local  --file=./migrations/0002_registrations_v2.sql
--   Remote:  npx wrangler d1 execute compound-rsvp-db --remote --file=./migrations/0002_registrations_v2.sql -y
CREATE TABLE IF NOT EXISTS registrations_v2 (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_code        TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  wechat_id       TEXT NOT NULL UNIQUE,
  phone           TEXT,
  referral_code   TEXT,
  tier            TEXT NOT NULL,
  wants_testing   INTEGER NOT NULL DEFAULT 0,
  companion       INTEGER NOT NULL DEFAULT 0,
  companion_name  TEXT,
  notes           TEXT,
  amount_due      INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'CNY',
  payment_status  TEXT NOT NULL DEFAULT 'pending',
  consent_service INTEGER NOT NULL DEFAULT 0,
  consent_privacy INTEGER NOT NULL DEFAULT 0,
  consent_health  INTEGER NOT NULL DEFAULT 0,
  consent_version TEXT,
  consent_ip      TEXT,
  created_at      TEXT NOT NULL,
  ua              TEXT
);

CREATE INDEX IF NOT EXISTS idx_registrations_v2_tier ON registrations_v2(tier);
