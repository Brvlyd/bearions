-- Expand landing page image slots from 3 to 6
-- Run this in Supabase SQL Editor if your table already exists.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'landing_page_images'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%position%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE landing_page_images DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE landing_page_images
  ADD CONSTRAINT landing_page_images_position_check
  CHECK (position BETWEEN 1 AND 6);
