-- Adds the CMS-managed navbar logo to site_settings.
-- Safe to re-run. For a fresh install, site-settings-schema.sql already covers this.
-- NULL logo_url means "use the bundled /images/bearion-logo.png".

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Reload the PostgREST schema cache so the new column is queryable immediately
NOTIFY pgrst, 'reload schema';
