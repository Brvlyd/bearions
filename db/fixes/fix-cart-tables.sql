-- ============================================
-- FIX ERROR 406 - Setup Carts & Admins Tables
-- ============================================
-- Error: 406 Not Acceptable pada carts dan admins
-- Solusi: Buat tabel + setup RLS policies
-- ============================================

-- ============================================
-- 1. CART TABLES
-- ============================================

-- Cart table
CREATE TABLE IF NOT EXISTS carts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  size VARCHAR(10),
  color VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cart_id, product_id, size, color)
);

-- ============================================
-- 2. ENABLE RLS
-- ============================================

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS POLICIES FOR CARTS
-- ============================================
-- User biasa bisa akses cart mereka sendiri setelah login
-- User TIDAK BISA akses cart user lain

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own cart" ON carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON carts;
DROP POLICY IF EXISTS "Users can update own cart" ON carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON carts;

-- Users can view their own cart
CREATE POLICY "Users can view own cart"
ON carts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own cart
CREATE POLICY "Users can insert own cart"
ON carts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own cart
CREATE POLICY "Users can update own cart"
ON carts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own cart
CREATE POLICY "Users can delete own cart"
ON carts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 4. RLS POLICIES FOR CART_ITEMS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;

-- Users can view their own cart items
CREATE POLICY "Users can view own cart items"
ON cart_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM carts 
    WHERE carts.id = cart_items.cart_id 
    AND carts.user_id = auth.uid()
  )
);

-- Users can insert their own cart items
CREATE POLICY "Users can insert own cart items"
ON cart_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM carts 
    WHERE carts.id = cart_items.cart_id 
    AND carts.user_id = auth.uid()
  )
);

-- Users can update their own cart items
CREATE POLICY "Users can update own cart items"
ON cart_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM carts 
    WHERE carts.id = cart_items.cart_id 
    AND carts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM carts 
    WHERE carts.id = cart_items.cart_id 
    AND carts.user_id = auth.uid()
  )
);

-- Users can delete their own cart items
CREATE POLICY "Users can delete own cart items"
ON cart_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM carts 
    WHERE carts.id = cart_items.cart_id 
    AND carts.user_id = auth.uid()
  )
);

-- ============================================
-- 5. FIX ADMINS TABLE POLICIES (SECURE)
-- ============================================

-- PENTING: Hanya admin yang bisa akses tabel admins
-- User biasa TIDAK BISA akses tabel ini

-- Drop existing policies
DROP POLICY IF EXISTS "Admins are viewable by authenticated users" ON admins;
DROP POLICY IF EXISTS "Admins can view all admins" ON admins;
DROP POLICY IF EXISTS "Admins can view own profile" ON admins;

-- Policy: Hanya admin yang sudah login bisa view tabel admins
CREATE POLICY "Only admins can view admins table"
ON admins FOR SELECT
TO authenticated
USING (
  -- Cek apakah user yang login adalah admin
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- Policy: Hanya admin yang bisa update profile sendiri
CREATE POLICY "Admins can update own profile"
ON admins FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- ============================================
-- 7. TRIGGERS FOR AUTO-UPDATE
-- ============================================

-- Trigger for carts updated_at
DROP TRIGGER IF EXISTS update_carts_updated_at ON carts;
CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for cart_items updated_at
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

GRANT ALL ON carts TO authenticated;
GRANT ALL ON cart_items TO authenticated;

-- ============================================
-- 9. VERIFIKASI
-- ============================================

-- Cek tables dibuat
SELECT 
  'Tables' as check_type,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('carts', 'cart_items');

-- Cek RLS enabled
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('carts', 'cart_items', 'admins');

-- Cek policies
SELECT 
  tablename,
  policyname,
  cmd as command
FROM pg_policies 
WHERE tablename IN ('carts', 'cart_items', 'admins')
ORDER BY tablename, cmd;

-- Cek indexes
SELECT 
  tablename,
  indexname
FROM pg_indexes 
WHERE tablename IN ('carts', 'cart_items')
ORDER BY tablename;

-- ============================================
-- SELESAI!
-- ============================================
-- Setelah run SQL ini:
-- ✅ Tabel carts & cart_items dibuat
-- ✅ RLS policies setup dengan benar
-- ✅ Admins policies diperbaiki (SECURE!)
-- ✅ Indexes untuk performance
-- ✅ Triggers untuk auto-update
--
-- SECURITY:
-- ✅ User biasa HANYA bisa akses cart mereka sendiri
-- ✅ User biasa TIDAK BISA akses tabel admins
-- ✅ Hanya admin yang bisa akses tabel admins
-- ✅ Admin bisa view & update profile sendiri
--
-- Error 406 seharusnya hilang!
-- Test lagi di website
-- ============================================
