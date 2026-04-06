-- Community Gallery Posts Table
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  caption TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
  ON community_posts (created_at DESC);

-- Enable RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to community_posts" ON community_posts;

-- Allow public read
CREATE POLICY "Allow public read access to community_posts"
  ON community_posts
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow admins to manage community_posts" ON community_posts;

-- Allow admins to manage posts
CREATE POLICY "Allow admins to manage community_posts"
  ON community_posts
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
