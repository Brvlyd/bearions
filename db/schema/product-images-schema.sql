-- Product Images Schema untuk Multiple Images per Product
-- Jalankan SQL ini di Supabase SQL Editor

-- Table untuk product images (multiple images per product)
CREATE TABLE IF NOT EXISTS product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index untuk faster queries
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON product_images(product_id, display_order);

-- Enable Row Level Security
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Policies untuk product_images
-- Semua orang bisa melihat product images
CREATE POLICY "Public product images are viewable by everyone"
ON product_images FOR SELECT
TO public
USING (true);

-- Hanya admin yang bisa insert, update, delete
CREATE POLICY "Admins can insert product images"
ON product_images FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

CREATE POLICY "Admins can update product images"
ON product_images FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

CREATE POLICY "Admins can delete product images"
ON product_images FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- Note: Kolom image_url di table products tetap ada untuk backward compatibility
-- dan bisa digunakan sebagai featured/main image
