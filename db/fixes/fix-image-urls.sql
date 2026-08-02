-- Fix Image URLs for Production
-- Replace local image paths dengan placeholder atau Supabase URLs

-- Option 1: Update dengan Placeholder URLs (untuk sementara testing)
UPDATE products 
SET image_url = 'https://placehold.co/600x600/e5e7eb/1f2937?text=' || 
  CASE 
    WHEN category = 'Tops' THEN 'T-Shirt'
    WHEN category = 'Bottoms' THEN 'Pants'
    WHEN category = 'Accessories' THEN 'Accessories'
    WHEN category = 'Outerwear' THEN 'Jacket'
    ELSE 'Product'
  END
WHERE image_url LIKE '/images/%' OR image_url IS NULL;

-- Option 2: Set to NULL (akan use SafeImage fallback)
-- UPDATE products 
-- SET image_url = NULL
-- WHERE image_url LIKE '/images/%';

-- Option 3: Update dengan Supabase Storage URLs (setelah upload images)
-- Contoh format:
-- UPDATE products 
-- SET image_url = 'https://iktbpmqahpkboovgbbib.supabase.co/storage/v1/object/public/product-images/products/bearion-tees.jpg'
-- WHERE id = 'your-product-id';

-- Clear product_images yang menggunakan local paths
DELETE FROM product_images 
WHERE image_url LIKE '/images/%';

-- Verify changes
SELECT id, name, category, image_url 
FROM products 
ORDER BY created_at DESC;
