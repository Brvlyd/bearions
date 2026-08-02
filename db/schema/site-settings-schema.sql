-- Site settings single-row table (browser tab title + favicon + navbar logo)
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY,
  site_title TEXT NOT NULL DEFAULT 'Bearion - Modern Fashion Store',
  site_description TEXT NOT NULL DEFAULT 'Premium clothing and fashion accessories',
  favicon_url TEXT,
  logo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  CONSTRAINT site_settings_singleton_check CHECK (id = 1)
);

-- Ensure existing tables (from older schema) get new columns with safe defaults
-- NULL logo_url means "use the bundled /images/bearion-logo.png".
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS site_title TEXT,
  ADD COLUMN IF NOT EXISTS site_description TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE site_settings
  ALTER COLUMN site_title SET DEFAULT 'Bearion - Modern Fashion Store',
  ALTER COLUMN site_description SET DEFAULT 'Premium clothing and fashion accessories';

UPDATE site_settings
SET
  site_title = COALESCE(site_title, 'Bearion - Modern Fashion Store'),
  site_description = COALESCE(site_description, 'Premium clothing and fashion accessories')
WHERE site_title IS NULL OR site_description IS NULL;

ALTER TABLE site_settings
  ALTER COLUMN site_title SET NOT NULL,
  ALTER COLUMN site_description SET NOT NULL;

INSERT INTO site_settings (id, site_title, site_description, favicon_url, logo_url)
VALUES (
  1,
  'Bearion - Modern Fashion Store',
  'Premium clothing and fashion accessories',
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  site_title = COALESCE(site_settings.site_title, EXCLUDED.site_title),
  site_description = COALESCE(site_settings.site_description, EXCLUDED.site_description);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to site_settings" ON site_settings;
CREATE POLICY "Allow public read access to site_settings"
  ON site_settings
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow admins to manage site_settings" ON site_settings;
CREATE POLICY "Allow admins to manage site_settings"
  ON site_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.id = auth.uid()
    )
  );

-- Push live updates to open tabs so the title/favicon changes without a reload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'site_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE site_settings;
  END IF;
END
$$;
