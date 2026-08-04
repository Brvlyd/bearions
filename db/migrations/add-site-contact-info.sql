-- Public-facing store contact info, editable from Admin > Site Settings.
--
-- /contact previously hardcoded this (including a wrong "Jakarta, Indonesia"
-- address for a store that actually operates out of Tembalang, Semarang).
-- Also feeds the LocalBusiness structured data in app/layout.tsx, which is
-- the one lever this codebase has over what search engines show about the
-- store — Google Business Profile is a separate system Biteship/this app
-- cannot touch, so it's out of scope here.

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS contact_address TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(120);

UPDATE site_settings
SET
  contact_address = COALESCE(contact_address, 'Jl. Banjarsari No.39, Tembalang, Kec. Tembalang, Kota Semarang, Jawa Tengah 50275'),
  contact_phone = COALESCE(contact_phone, '+62 812 3456 7890'),
  contact_email = COALESCE(contact_email, 'hello@bearion.com')
WHERE id = 1;

COMMENT ON COLUMN site_settings.contact_address IS 'Shown on /contact and in LocalBusiness structured data.';
COMMENT ON COLUMN site_settings.contact_phone IS 'Shown on /contact and in LocalBusiness structured data.';
COMMENT ON COLUMN site_settings.contact_email IS 'Shown on /contact and in LocalBusiness structured data.';
