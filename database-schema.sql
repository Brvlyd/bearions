-- Database Schema untuk Bearions
-- Jalankan SQL ini di Supabase SQL Editor

-- Table untuk products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL DEFAULT 'Tops',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table untuk admins
CREATE TABLE IF NOT EXISTS admins (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policies untuk products
-- Semua orang bisa melihat products
CREATE POLICY "Public products are viewable by everyone"
ON products FOR SELECT
TO public
USING (true);

-- Hanya admin yang bisa insert, update, delete
CREATE POLICY "Admins can insert products"
ON products FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

CREATE POLICY "Admins can update products"
ON products FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

CREATE POLICY "Admins can delete products"
ON products FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- Policies untuk admins
CREATE POLICY "Admins are viewable by authenticated users"
ON admins FOR SELECT
TO authenticated
USING (true);

-- Function untuk update updated_at otomatis
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger untuk products
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (opsional)
INSERT INTO products (name, description, price, stock, category, image_url) VALUES
('Bearion Absolute Tees', 'Comfortable cotton t-shirt with unique bear design', 1.00, 100, 'Tops', '/images/bearion-tees.jpg'),
('Animated Bear', 'Premium animated bear design t-shirt', 380000.00, 50, 'Tops', '/images/animated-bear.jpg');
