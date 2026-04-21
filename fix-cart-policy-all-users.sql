-- ============================================
-- FIX: Cart policy for all authenticated users
-- ============================================
-- Symptom:
-- - User lama bisa add to cart
-- - User lain / user baru gagal add to cart
--
-- Root cause (umum):
-- - Policy INSERT di tabel carts tidak ada / tidak sesuai
-- - Sehingga getOrCreateCart gagal saat user belum punya cart
-- ============================================

-- 1) Pastikan tabel ada
CREATE TABLE IF NOT EXISTS carts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- 2) Enable RLS
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- 3) Hapus policy lama (jika ada) agar tidak konflik
DROP POLICY IF EXISTS "Users can view their own cart" ON carts;
DROP POLICY IF EXISTS "Users can create their own cart" ON carts;
DROP POLICY IF EXISTS "Users can update their own cart" ON carts;
DROP POLICY IF EXISTS "Users can delete their own cart" ON carts;
DROP POLICY IF EXISTS "Users can view own cart" ON carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON carts;
DROP POLICY IF EXISTS "Users can update own cart" ON carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON carts;

DROP POLICY IF EXISTS "Users can view their cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can add items to their cart" ON cart_items;
DROP POLICY IF EXISTS "Users can update their cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete their cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;

-- 4) Policy carts
CREATE POLICY "Users can view own cart"
ON carts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart"
ON carts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
ON carts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart"
ON carts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5) Policy cart_items
CREATE POLICY "Users can view own cart items"
ON cart_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM carts
    WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own cart items"
ON cart_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM carts
    WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own cart items"
ON cart_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM carts
    WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM carts
    WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own cart items"
ON cart_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM carts
    WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
  )
);

-- 6) Grants (aman untuk client auth role)
GRANT ALL ON carts TO authenticated;
GRANT ALL ON cart_items TO authenticated;

-- 7) Index performa
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- 8) Verifikasi cepat
SELECT 'carts policies' AS section, policyname, cmd
FROM pg_policies
WHERE tablename = 'carts'
ORDER BY cmd, policyname;

SELECT 'cart_items policies' AS section, policyname, cmd
FROM pg_policies
WHERE tablename = 'cart_items'
ORDER BY cmd, policyname;
