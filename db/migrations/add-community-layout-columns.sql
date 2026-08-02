-- Add layout metadata to community posts so admin can arrange gallery like tetris
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS layout_size VARCHAR(10) NOT NULL DEFAULT 'm',
  ADD COLUMN IF NOT EXISTS layout_order INTEGER NOT NULL DEFAULT 0;

-- Backfill layout order for existing rows if needed
WITH ordered_posts AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS new_order
  FROM community_posts
)
UPDATE community_posts cp
SET layout_order = ordered_posts.new_order
FROM ordered_posts
WHERE cp.id = ordered_posts.id
  AND (cp.layout_order IS NULL OR cp.layout_order = 0);

CREATE INDEX IF NOT EXISTS idx_community_posts_layout_order
  ON community_posts (layout_order ASC, created_at DESC);
