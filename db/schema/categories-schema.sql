-- Categories Table Schema
-- Run this in Supabase SQL Editor

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policies for categories
-- Everyone can view categories
CREATE POLICY "Public categories are viewable by everyone"
ON categories FOR SELECT
TO public
USING (true);

-- Only admins can insert, update, delete
CREATE POLICY "Admins can insert categories"
ON categories FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

CREATE POLICY "Admins can update categories"
ON categories FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

CREATE POLICY "Admins can delete categories"
ON categories FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, description) VALUES
('T-Shirt', 'T-shirts and casual tops'),
('Pants', 'Pants and bottoms'),
('Jacket', 'Jackets and outerwear'),
('Accessories', 'Accessories and other items')
ON CONFLICT (name) DO NOTHING;
