-- Add Indonesian language fields to products table for bilingual support

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS name_id TEXT,
ADD COLUMN IF NOT EXISTS description_id TEXT;

-- Add comments for documentation
COMMENT ON COLUMN products.name_id IS 'Product name in Indonesian language';
COMMENT ON COLUMN products.description_id IS 'Product description in Indonesian language';

-- Update existing products with Indonesian translations (examples)
-- You can run these manually or customize for your products

-- Example: Update a specific product
-- UPDATE products 
-- SET name_id = 'Nama Produk Indonesia', 
--     description_id = 'Deskripsi produk dalam bahasa Indonesia'
-- WHERE id = 'your-product-id';

-- Note: After running this migration, update your products via admin panel 
-- to add Indonesian names and descriptions
