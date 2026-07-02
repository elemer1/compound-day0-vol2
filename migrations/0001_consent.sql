-- Adds the consent-record columns to an EXISTING bookings table.
-- (schema.sql already includes these for brand-new databases; this migration is
--  only for databases that were created before consent was added.)
--
-- Run ONCE per database. Re-running errors with "duplicate column name" — that
-- error just means the migration was already applied; it is safe to ignore.
--
--   Local :  npx wrangler d1 execute compound-rsvp-db --local  --file=./migrations/0001_consent.sql
--   Remote:  npx wrangler d1 execute compound-rsvp-db --remote --file=./migrations/0001_consent.sql -y
ALTER TABLE bookings ADD COLUMN consent_service INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN consent_privacy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN consent_health  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN consent_version TEXT;
ALTER TABLE bookings ADD COLUMN consent_ip      TEXT;
