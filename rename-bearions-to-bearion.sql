-- Renames the brand from "Bearions" to "Bearion" in rows already saved in the
-- database. The codebase no longer contains the old spelling, but text an admin
-- typed through the CMS lives in Postgres and is not covered by that change.
-- Safe to re-run: matching rows simply stop matching after the first pass.

-- Browser tab title + meta description
UPDATE site_settings
SET site_title = REPLACE(site_title, 'Bearions', 'Bearion'),
    site_description = REPLACE(site_description, 'Bearions', 'Bearion')
WHERE site_title LIKE '%Bearions%' OR site_description LIKE '%Bearions%';

-- About Us page copy (content_blocks is JSONB, so it is patched as text)
UPDATE about_us_content
SET title = REPLACE(title, 'Bearions', 'Bearion'),
    headline = REPLACE(headline, 'Bearions', 'Bearion'),
    content_blocks = REPLACE(content_blocks::text, 'Bearions', 'Bearion')::jsonb
WHERE title LIKE '%Bearions%'
   OR headline LIKE '%Bearions%'
   OR content_blocks::text LIKE '%Bearions%';

-- Catalog copy, both language columns
UPDATE products
SET name = REPLACE(name, 'Bearions', 'Bearion'),
    description = REPLACE(description, 'Bearions', 'Bearion'),
    name_id = REPLACE(name_id, 'Bearions', 'Bearion'),
    description_id = REPLACE(description_id, 'Bearions', 'Bearion')
WHERE name LIKE '%Bearions%'
   OR description LIKE '%Bearions%'
   OR name_id LIKE '%Bearions%'
   OR description_id LIKE '%Bearions%';

-- Payment instructions shown at checkout (e.g. bank account holder name)
UPDATE payment_methods
SET display_name = REPLACE(display_name, 'Bearions', 'Bearion'),
    description = REPLACE(description, 'Bearions', 'Bearion'),
    instructions = REPLACE(instructions, 'Bearions', 'Bearion'),
    account_name = REPLACE(account_name, 'Bearions', 'Bearion')
WHERE display_name LIKE '%Bearions%'
   OR description LIKE '%Bearions%'
   OR instructions LIKE '%Bearions%'
   OR account_name LIKE '%Bearions%';

-- Verify nothing is left behind (every count should be 0)
SELECT 'site_settings' AS source, COUNT(*) AS remaining FROM site_settings
  WHERE site_title LIKE '%Bearions%' OR site_description LIKE '%Bearions%'
UNION ALL
SELECT 'about_us_content', COUNT(*) FROM about_us_content
  WHERE title LIKE '%Bearions%' OR headline LIKE '%Bearions%'
     OR content_blocks::text LIKE '%Bearions%'
UNION ALL
SELECT 'products', COUNT(*) FROM products
  WHERE name LIKE '%Bearions%' OR description LIKE '%Bearions%'
     OR name_id LIKE '%Bearions%' OR description_id LIKE '%Bearions%'
UNION ALL
SELECT 'payment_methods', COUNT(*) FROM payment_methods
  WHERE display_name LIKE '%Bearions%' OR description LIKE '%Bearions%'
     OR instructions LIKE '%Bearions%' OR account_name LIKE '%Bearions%';
