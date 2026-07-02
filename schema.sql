-- Compound × muShanghai · 未來人計劃 預約登記
-- D1 (SQLite) schema. Idempotent: safe to re-run without wiping bookings.

CREATE TABLE IF NOT EXISTS slots (
  id          TEXT PRIMARY KEY,
  sort_order  INTEGER NOT NULL,
  time_label  TEXT NOT NULL,
  end_label   TEXT NOT NULL,
  capacity    INTEGER NOT NULL DEFAULT 3
);

CREATE TABLE IF NOT EXISTS bookings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_code    TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  birth_year  INTEGER NOT NULL,
  birth_month INTEGER NOT NULL,
  gender      TEXT NOT NULL,
  slot_id     TEXT NOT NULL REFERENCES slots(id),
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  ua          TEXT,
  -- consent record (see functions/api/register.js): which documents were
  -- agreed to, the document version, and the IP the agreement came from.
  consent_service INTEGER NOT NULL DEFAULT 0,
  consent_privacy INTEGER NOT NULL DEFAULT 0,
  consent_health  INTEGER NOT NULL DEFAULT 0,
  consent_version TEXT,
  consent_ip      TEXT
);

CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);

-- 12 blood-draw slots, 08:30–12:10, 20 min each, 3 seats each.
INSERT OR IGNORE INTO slots (id, sort_order, time_label, end_label, capacity) VALUES
  ('s0830', 1,  '08:30', '08:50', 3),
  ('s0850', 2,  '08:50', '09:10', 3),
  ('s0910', 3,  '09:10', '09:30', 3),
  ('s0930', 4,  '09:30', '09:50', 3),
  ('s0950', 5,  '09:50', '10:10', 3),
  ('s1010', 6,  '10:10', '10:30', 3),
  ('s1030', 7,  '10:30', '10:50', 3),
  ('s1050', 8,  '10:50', '11:10', 3),
  ('s1110', 9,  '11:10', '11:30', 3),
  ('s1130', 10, '11:30', '11:50', 3),
  ('s1150', 11, '11:50', '12:10', 3),
  ('s1210', 12, '12:10', '12:30', 3);

-- ============================================================================
-- Day 0 vol.2 (2026-07-11) — WeChat-first registration with referral pricing.
-- No slot booking this round (see `bookings`/`slots` above for the vol.1 flow) —
-- this table is standalone and purely additive, safe to layer onto the existing
-- production DB without touching vol.1 data. See migrations/0002_registrations_v2.sql
-- and migrations/0003_v2_expanded_fields.sql.
-- ============================================================================
CREATE TABLE IF NOT EXISTS registrations_v2 (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_code          TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  wechat_id         TEXT NOT NULL UNIQUE,
  phone             TEXT,
  company_title     TEXT,
  referral_code     TEXT,
  inviter_name      TEXT,
  tier              TEXT NOT NULL,                    -- vip | friend | public
  ticket_choice     TEXT,                              -- salon | member | decide_onsite
  wants_testing     INTEGER NOT NULL DEFAULT 0,         -- derived from ticket_choice='member'
  testing_slot      TEXT,                               -- one of TESTING_SLOTS, member-only
  workout_pref      TEXT,                                -- breathwork | hiit | zone2 | none
  companion         INTEGER NOT NULL DEFAULT 0,          -- derived: companion_count > 0
  companion_count   INTEGER NOT NULL DEFAULT 0,          -- 0-2
  companion_name    TEXT,                                -- companion #1 (kept for compat)
  companion1_wechat TEXT,
  companion2_name   TEXT,
  companion2_wechat TEXT,
  topic_interest    TEXT,
  health_challenge  TEXT,
  notes             TEXT,
  amount_due        INTEGER NOT NULL,                 -- CNY, whole yuan
  currency          TEXT NOT NULL DEFAULT 'CNY',
  payment_status    TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | comped
  consent_service   INTEGER NOT NULL DEFAULT 0,
  consent_privacy   INTEGER NOT NULL DEFAULT 0,
  consent_health    INTEGER NOT NULL DEFAULT 0,
  consent_version   TEXT,
  consent_ip        TEXT,
  created_at        TEXT NOT NULL,
  ua                TEXT
);

CREATE INDEX IF NOT EXISTS idx_registrations_v2_tier ON registrations_v2(tier);
