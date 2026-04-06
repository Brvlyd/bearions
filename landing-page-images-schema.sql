-- Landing Page Images Table
CREATE TABLE IF NOT EXISTS landing_page_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position INTEGER NOT NULL UNIQUE CHECK (position BETWEEN 1 AND 6),
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default placeholder images
INSERT INTO landing_page_images (position, image_url) VALUES
  (1, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800'),
  (2, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'),
  (3, 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800')
ON CONFLICT (position) DO NOTHING;

-- Enable RLS
ALTER TABLE landing_page_images ENABLE ROW LEVEL SECURITY;

-- Allow public to read
CREATE POLICY "Allow public read access to landing_page_images"
  ON landing_page_images
  FOR SELECT
  TO public
  USING (true);

-- Allow admins to manage
CREATE POLICY "Allow admins to manage landing_page_images"
  ON landing_page_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );
