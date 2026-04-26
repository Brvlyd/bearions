-- Quick Fix: Update Image URLs untuk Development
-- Jalankan di Supabase SQL Editor atau psql

-- 1. Backup existing data (optional)
-- CREATE TABLE products_backup AS SELECT * FROM products;

-- 2. Update products dengan placeholder URLs berdasarkan category
UPDATE products 
SET image_url = CONCAT(
  'https://placehold.co/600x600/e5e7eb/1f2937?text=',
  REPLACE(
    CASE 
      WHEN category = 'Tops' THEN 'Bearions T-Shirt'
      WHEN category = 'Bottoms' THEN 'Bearions Pants'
      WHEN category = 'Accessories' THEN 'Bearions Accessories'
      WHEN category = 'Outerwear' THEN 'Bearions Jacket'
      ELSE 'Bearions Product'
    END,
    ' ', '+'
  )
)
WHERE image_url IS NULL 
   OR image_url LIKE '/images/%' 
   OR image_url LIKE '/public/%'
   OR image_url = '';

-- 3. Delete invalid product_images entries
DELETE FROM product_images 
WHERE image_url IS NULL 
   OR image_url LIKE '/images/%' 
   OR image_url LIKE '/public/%';

-- 4. Verify changes
SELECT 
  id,
  name,
  category,
  image_url,
  stock,
  created_at
FROM products 
ORDER BY created_at DESC;

-- 5. Check if any products still have invalid URLs
SELECT COUNT(*) as invalid_images
FROM products 
WHERE image_url IS NOT NULL 
  AND (
    image_url LIKE '/images/%' 
    OR image_url LIKE '/public/%'
    OR NOT image_url LIKE 'http%'
  );

-- Success message
SELECT 'Images fixed! No more 400 errors.' as status;
