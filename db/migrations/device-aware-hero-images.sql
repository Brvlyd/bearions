-- Per-device (desktop/mobile) hero images for the landing page, plus a new
-- equivalent table for a Community page banner. Run this in Supabase SQL Editor.
--
-- Desktop keeps the existing 1-6 photo mosaic. Mobile is capped to a single
-- slot (position 1) -- a phone screen has no room for a multi-photo grid, and
-- the admin UI only ever offers one upload slot for it.

-- ============================================================
-- 1. landing_page_images: add a device column
-- ============================================================

ALTER TABLE landing_page_images
  ADD COLUMN IF NOT EXISTS device VARCHAR(10) NOT NULL DEFAULT 'desktop';

-- The original schema declared `position INTEGER ... UNIQUE`, which Postgres
-- named automatically. Find that single-column unique constraint dynamically
-- (its name isn't guaranteed) and replace it with one scoped per device, so
-- desktop position 1 and mobile position 1 can coexist.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'landing_page_images'::regclass
    AND contype = 'u'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE landing_page_images DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE landing_page_images
  DROP CONSTRAINT IF EXISTS landing_page_images_device_check;
ALTER TABLE landing_page_images
  ADD CONSTRAINT landing_page_images_device_check CHECK (device IN ('desktop', 'mobile'));

ALTER TABLE landing_page_images
  DROP CONSTRAINT IF EXISTS landing_page_images_device_position_key;
ALTER TABLE landing_page_images
  ADD CONSTRAINT landing_page_images_device_position_key UNIQUE (device, position);

ALTER TABLE landing_page_images
  DROP CONSTRAINT IF EXISTS landing_page_images_mobile_single_slot;
ALTER TABLE landing_page_images
  ADD CONSTRAINT landing_page_images_mobile_single_slot CHECK (device <> 'mobile' OR position = 1);

-- landing-page-images-schema.sql's admin-write policy checks admins.user_id,
-- a column that does not exist on admins (id IS the admin's auth.users id --
-- see database-schema.sql / fix-users-admins-rls.sql). CREATE POLICY against a
-- nonexistent column fails, so this policy likely never actually existed and
-- admin uploads/edits/deletes have been silently blocked by RLS's default
-- deny. Recreate it with the check every other admin-write policy in this
-- project actually uses.
DROP POLICY IF EXISTS "Allow admins to manage landing_page_images" ON landing_page_images;
CREATE POLICY "Allow admins to manage landing_page_images"
  ON landing_page_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ============================================================
-- 2. community_page_images: same shape, for the Community page banner
-- ============================================================

CREATE TABLE IF NOT EXISTS community_page_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device VARCHAR(10) NOT NULL DEFAULT 'desktop' CHECK (device IN ('desktop', 'mobile')),
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 6),
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT community_page_images_device_position_key UNIQUE (device, position),
  CONSTRAINT community_page_images_mobile_single_slot CHECK (device <> 'mobile' OR position = 1)
);

ALTER TABLE community_page_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to community_page_images" ON community_page_images;
CREATE POLICY "Allow public read access to community_page_images"
  ON community_page_images
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow admins to manage community_page_images" ON community_page_images;
CREATE POLICY "Allow admins to manage community_page_images"
  ON community_page_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
