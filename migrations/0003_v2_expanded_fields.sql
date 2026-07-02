-- Expands registrations_v2 for the fuller intake form (company/title, inviter
-- name, 3-way ticket choice, biomarker-slot preference, workout preference, up
-- to two named companions, two optional reflection questions).
-- (schema.sql already includes these for brand-new databases; this migration is
--  only needed to layer them onto an EXISTING registrations_v2 table.)
--
-- Purely additive — keeps the original wants_testing/companion/companion_name
-- columns for backward compatibility (still written as derived values), just
-- adds new ones alongside. Safe to re-run: ALTER ... ADD COLUMN errors with
-- "duplicate column name" if already applied — that error is safe to ignore.
--
--   Local :  npx wrangler d1 execute compound-rsvp-db --local  --file=./migrations/0003_v2_expanded_fields.sql
--   Remote:  npx wrangler d1 execute compound-rsvp-db --remote --file=./migrations/0003_v2_expanded_fields.sql -y
ALTER TABLE registrations_v2 ADD COLUMN company_title    TEXT;
ALTER TABLE registrations_v2 ADD COLUMN inviter_name     TEXT;
ALTER TABLE registrations_v2 ADD COLUMN ticket_choice    TEXT;
ALTER TABLE registrations_v2 ADD COLUMN testing_slot     TEXT;
ALTER TABLE registrations_v2 ADD COLUMN workout_pref     TEXT;
ALTER TABLE registrations_v2 ADD COLUMN companion_count  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE registrations_v2 ADD COLUMN companion1_wechat TEXT;
ALTER TABLE registrations_v2 ADD COLUMN companion2_name  TEXT;
ALTER TABLE registrations_v2 ADD COLUMN companion2_wechat TEXT;
ALTER TABLE registrations_v2 ADD COLUMN topic_interest   TEXT;
ALTER TABLE registrations_v2 ADD COLUMN health_challenge TEXT;
