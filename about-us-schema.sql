-- About Us single-content table
CREATE TABLE IF NOT EXISTS about_us_content (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'About Us',
  headline TEXT NOT NULL DEFAULT 'Bearions builds everyday essentials with practical quality and honest pricing.',
  content_blocks JSONB NOT NULL DEFAULT '[{"id":"default-text","type":"text","text":"We focus on useful products, consistent service, and a smooth shopping experience."}]'::jsonb,
  background_image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  CONSTRAINT about_us_singleton_check CHECK (id = 1)
);

-- Ensure existing tables (from older schema) get new columns with safe defaults
ALTER TABLE about_us_content
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS content_blocks JSONB;

ALTER TABLE about_us_content
  ALTER COLUMN title SET DEFAULT 'About Us',
  ALTER COLUMN headline SET DEFAULT 'Bearions builds everyday essentials with practical quality and honest pricing.',
  ALTER COLUMN content_blocks SET DEFAULT '[{"id":"default-text","type":"text","text":"We focus on useful products, consistent service, and a smooth shopping experience."}]'::jsonb;

UPDATE about_us_content
SET
  title = COALESCE(title, 'About Us'),
  headline = COALESCE(headline, 'Bearions builds everyday essentials with practical quality and honest pricing.'),
  content_blocks = COALESCE(
    content_blocks,
    '[{"id":"default-text","type":"text","text":"We focus on useful products, consistent service, and a smooth shopping experience."}]'::jsonb
  )
WHERE title IS NULL OR headline IS NULL OR content_blocks IS NULL;

ALTER TABLE about_us_content
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN headline SET NOT NULL,
  ALTER COLUMN content_blocks SET NOT NULL;

INSERT INTO about_us_content (id, title, headline, content_blocks)
VALUES (
  1,
  'About Us',
  'Bearions builds everyday essentials with practical quality and honest pricing.',
  '[{"id":"default-text","type":"text","text":"We focus on useful products, consistent service, and a smooth shopping experience."}]'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET
  title = COALESCE(about_us_content.title, EXCLUDED.title),
  headline = COALESCE(about_us_content.headline, EXCLUDED.headline),
  content_blocks = COALESCE(about_us_content.content_blocks, EXCLUDED.content_blocks);

ALTER TABLE about_us_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to about_us_content" ON about_us_content;
CREATE POLICY "Allow public read access to about_us_content"
  ON about_us_content
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow admins to manage about_us_content" ON about_us_content;
CREATE POLICY "Allow admins to manage about_us_content"
  ON about_us_content
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
