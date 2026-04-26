-- ============================================
-- MANUAL APPROVE USER - Skip Email Confirmation
-- ============================================
-- Gunakan ini jika:
-- 1. Email confirmation disabled tapi user sudah terlanjur daftar
-- 2. Email tidak terkirim dan user perlu diapprove manual
-- 3. Development/testing tanpa email
-- ============================================

-- ============================================
-- Option 1: Approve SEMUA user (REKOMENDASI)
-- ============================================
-- Jalankan query ini untuk approve semua user sekaligus

UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Hasil: Semua user yang belum konfirmasi akan di-approve
-- Sekarang mereka bisa langsung login!

-- ============================================
-- Option 2: Approve user berdasarkan email
-- ============================================
-- Uncomment dan ganti 'user@example.com' dengan email asli

/*
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com'
  AND email_confirmed_at IS NULL;
*/

-- ============================================
-- Option 3: Approve user berdasarkan ID
-- ============================================
-- Uncomment dan ganti UUID dengan ID user asli

/*
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
  AND email_confirmed_at IS NULL;
*/

-- Cara cari UUID user:
-- SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- ============================================
-- VERIFIKASI - Cek user yang sudah confirmed
-- ============================================

-- Lihat semua user dan status konfirmasi
SELECT 
  email,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '❌ Not Confirmed'
  END as status,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- Hitung jumlah user confirmed vs not confirmed
SELECT 
  COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as confirmed_users,
  COUNT(*) FILTER (WHERE email_confirmed_at IS NULL) as pending_users,
  COUNT(*) as total_users
FROM auth.users;

-- ============================================
-- RESET (untuk testing ulang)
-- ============================================
-- Uncomment untuk reset confirmation status
-- HATI-HATI: User tidak bisa login setelah reset!

/*
UPDATE auth.users 
SET email_confirmed_at = NULL
WHERE email = 'test@example.com';
*/

-- ============================================
-- SELESAI!
-- ============================================
-- Setelah approve, user bisa langsung login
-- Tidak perlu tunggu email konfirmasi
-- ============================================
