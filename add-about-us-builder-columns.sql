-- Migrate existing about_us_content table to block-based content model
ALTER TABLE about_us_content
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS content_blocks JSONB;

ALTER TABLE about_us_content
  ALTER COLUMN title SET DEFAULT 'About Us',
  ALTER COLUMN headline SET DEFAULT 'Bearions builds everyday essentials with practical quality and honest pricing.',
  ALTER COLUMN content_blocks SET DEFAULT '[{"id":"default-text","type":"text","text":"We focus on useful products, consistent service, and a smooth shopping experience."}]'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'about_us_content'
      AND column_name = 'title_en'
  ) THEN
    EXECUTE '
      UPDATE about_us_content
      SET
        title = COALESCE(title, title_en, title_id, ''About Us''),
        headline = COALESCE(
          headline,
          headline_en,
          headline_id,
          ''Bearions builds everyday essentials with practical quality and honest pricing.''
        ),
        content_blocks = COALESCE(
          content_blocks,
          jsonb_build_array(
            jsonb_build_object(
              ''id'', ''legacy-text'',
              ''type'', ''text'',
              ''text'', COALESCE(body_en, body_id, ''We focus on useful products, consistent service, and a smooth shopping experience.'')
            )
          )
        )
      WHERE id = 1 OR title IS NULL OR headline IS NULL OR content_blocks IS NULL
    ';
  ELSE
    UPDATE about_us_content
    SET
      title = COALESCE(title, 'About Us'),
      headline = COALESCE(headline, 'Bearions builds everyday essentials with practical quality and honest pricing.'),
      content_blocks = COALESCE(
        content_blocks,
        '[{"id":"default-text","type":"text","text":"We focus on useful products, consistent service, and a smooth shopping experience."}]'::jsonb
      )
    WHERE id = 1 OR title IS NULL OR headline IS NULL OR content_blocks IS NULL;
  END IF;
END;
$$;

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

ALTER TABLE about_us_content
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN headline SET NOT NULL,
  ALTER COLUMN content_blocks SET NOT NULL;
