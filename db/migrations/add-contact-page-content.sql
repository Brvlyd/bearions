-- Editable content for /contact, from Admin > Kontak.
--
-- The address/phone/email columns already existed (add-site-contact-info.sql);
-- everything else on that page was hardcoded in lib/i18n.tsx, so the shop owner
-- could not change opening hours, add a WhatsApp number, or turn the message
-- form off without a developer and a deploy.
--
-- These live on the same site_settings singleton as the contact details they
-- sit next to, so the Contact admin page saves one row and the LocalBusiness
-- structured data in app/layout.tsx keeps reading the same source of truth.

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS contact_heading TEXT,
  ADD COLUMN IF NOT EXISTS contact_heading_id TEXT,
  ADD COLUMN IF NOT EXISTS contact_subheading TEXT,
  ADD COLUMN IF NOT EXISTS contact_subheading_id TEXT,
  ADD COLUMN IF NOT EXISTS contact_hours_weekday TEXT,
  ADD COLUMN IF NOT EXISTS contact_hours_weekday_id TEXT,
  ADD COLUMN IF NOT EXISTS contact_hours_weekend TEXT,
  ADD COLUMN IF NOT EXISTS contact_hours_weekend_id TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp VARCHAR(30),
  ADD COLUMN IF NOT EXISTS contact_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_note TEXT,
  ADD COLUMN IF NOT EXISTS contact_note_id TEXT,
  ADD COLUMN IF NOT EXISTS contact_form_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Seed with what the page already showed, so applying this migration changes
-- nothing visible until an admin edits something.
UPDATE site_settings
SET
  contact_heading = COALESCE(contact_heading, 'Contact Us'),
  contact_heading_id = COALESCE(contact_heading_id, 'Hubungi Kami'),
  contact_subheading = COALESCE(contact_subheading, 'We''d love to hear from you'),
  contact_subheading_id = COALESCE(contact_subheading_id, 'Kami ingin mendengar dari Anda'),
  contact_hours_weekday = COALESCE(contact_hours_weekday, 'Monday - Friday: 9:00 AM - 6:00 PM'),
  contact_hours_weekday_id = COALESCE(contact_hours_weekday_id, 'Senin - Jumat: 09:00 - 18:00'),
  contact_hours_weekend = COALESCE(contact_hours_weekend, 'Saturday - Sunday: 10:00 AM - 4:00 PM'),
  contact_hours_weekend_id = COALESCE(contact_hours_weekend_id, 'Sabtu - Minggu: 10:00 - 16:00')
WHERE id = 1;

COMMENT ON COLUMN site_settings.contact_whatsapp IS 'Digits only or +62 form; rendered as a wa.me link on /contact. Empty hides the button.';
COMMENT ON COLUMN site_settings.contact_maps_url IS 'Google Maps link for the store address. Empty hides the map button.';
COMMENT ON COLUMN site_settings.contact_note IS 'Short expectation-setting line under the form, e.g. usual reply time.';
COMMENT ON COLUMN site_settings.contact_form_enabled IS 'False hides the message form and leaves only the direct contact details.';
