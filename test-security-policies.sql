-- ============================================
-- TEST SECURITY POLICIES
-- ============================================
-- Gunakan ini untuk verifikasi bahwa:
-- 1. User biasa TIDAK bisa akses tabel admins
-- 2. Hanya admin yang bisa akses tabel admins
-- 3. User hanya bisa akses cart mereka sendiri
-- ============================================

-- ============================================
-- Test 1: Cek Policies Admins Table
-- ============================================

SELECT 
  'Admins Table Policies' as info,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'admins';

-- Expected result:
-- ✅ "Only admins can view admins table" - SELECT
-- ✅ "Admins can update own profile" - UPDATE
-- ❌ TIDAK ADA policy yang allow semua authenticated users

-- ============================================
-- Test 2: Cek Policies Carts Table
-- ============================================

SELECT 
  'Carts Table Policies' as info,
  policyname,
  cmd as command
FROM pg_policies 
WHERE tablename = 'carts';

-- Expected result:
-- ✅ 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- ✅ Semua untuk "own cart" only

-- ============================================
-- Test 3: Simulasi User Biasa Coba Akses Admins
-- ============================================

-- Ambil sample user ID (bukan admin)
SELECT 
  'Sample Regular User' as info,
  u.id as user_id,
  u.email,
  CASE 
    WHEN a.id IS NULL THEN '✅ Regular User (NOT admin)'
    ELSE '❌ Is Admin'
  END as user_type
FROM users u
LEFT JOIN admins a ON u.id = a.id
WHERE a.id IS NULL
LIMIT 1;

-- ============================================
-- Test 4: List Semua Admin
-- ============================================

SELECT 
  'Admins List' as info,
  id,
  email,
  created_at
FROM admins
ORDER BY created_at DESC;

-- Jika Anda login sebagai user biasa, query ini akan:
-- ❌ Return 0 rows (atau error permission denied)
-- ✅ Jika login sebagai admin, akan tampil data

-- ============================================
-- Test 5: Cek User Punya Cart
-- ============================================

SELECT 
  'User Carts' as info,
  c.id as cart_id,
  c.user_id,
  u.email,
  COUNT(ci.id) as total_items
FROM carts c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN cart_items ci ON c.id = ci.cart_id
GROUP BY c.id, c.user_id, u.email
ORDER BY c.created_at DESC;

-- Setiap user hanya bisa lihat cart mereka sendiri

-- ============================================
-- Test 6: Security Summary
-- ============================================

SELECT 
  'Security Summary' as check_type,
  (
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE tablename = 'admins' 
      AND policyname LIKE '%Only admins%'
  ) as admins_secure_policy_count,
  (
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE tablename = 'carts'
  ) as carts_policy_count,
  (
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE tablename = 'cart_items'
  ) as cart_items_policy_count;

-- Expected:
-- admins_secure_policy_count: 1 (Only admins can view)
-- carts_policy_count: 4 (SELECT, INSERT, UPDATE, DELETE)
-- cart_items_policy_count: 4 (SELECT, INSERT, UPDATE, DELETE)

-- ============================================
-- INTERPRETASI HASIL:
-- ============================================
-- ✅ AMAN jika:
--   - Admins table hanya punya policy "Only admins..."
--   - Carts & cart_items punya 4 policies masing-masing
--   - User biasa tidak bisa query admins table
--
-- ❌ TIDAK AMAN jika:
--   - Ada policy yang allow semua authenticated users ke admins
--   - User biasa bisa lihat data admin
--   - User bisa lihat cart user lain
-- ============================================
