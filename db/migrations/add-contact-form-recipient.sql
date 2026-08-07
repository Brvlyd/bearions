-- Inbox that receives /contact form submissions, editable from Admin > Kontak.
--
-- This used to be fixed to the CONTACT_RECEIVER_EMAIL environment variable, so
-- moving the messages to another address meant editing .env and redeploying —
-- something the shop owner cannot do. The env var stays as the fallback, which
-- is what makes this migration a no-op until an admin actually types something.
--
-- Deliberately NOT seeded from contact_email: the address shown to buyers and
-- the address that receives their messages are the same today, but they are two
-- different decisions, and seeding would silently change where mail lands for
-- any store whose env var points elsewhere.

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS contact_form_recipient TEXT;

COMMENT ON COLUMN site_settings.contact_form_recipient IS
  'Where the contact form delivers. Comma-separated for several inboxes. Empty falls back to CONTACT_RECEIVER_EMAIL. Note site_settings is publicly readable, so this is not a place for an address meant to stay private.';
