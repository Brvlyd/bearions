-- =======================================================
-- FIX REGISTRASI USER - JALANKAN DI SUPABASE SQL EDITOR
-- =======================================================
-- Masalah: User baru tidak tersimpan di tabel users
-- Error: 406 Not Acceptable, 401 Unauthorized (RLS blocking)
-- Solusi: Setup trigger database dengan benar
-- =======================================================

-- Step 1: Buat/pastikan tabel users ada
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 2: Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 3: Hapus SEMUA policies lama
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Enable insert for service role" ON users;
DROP POLICY IF EXISTS "Allow user insert on signup" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;

-- Step 4: Buat policies baru (MINIMAL untuk keamanan)
-- Policy 1: User bisa melihat profil sendiri
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: User bisa update profil sendiri  
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Admin bisa melihat semua user
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- PENTING: TIDAK ADA POLICY INSERT UNTUK CLIENT
-- Insert hanya boleh via trigger dengan elevated privileges

-- Step 5: Hapus function dan trigger lama
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 6: Buat function baru (SECURITY DEFINER = elevated privileges)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Ini penting! Function berjalan dengan elevated privileges
SET search_path = public
AS $$
BEGIN
  -- Insert user profile otomatis, BYPASS RLS karena SECURITY DEFINER
  INSERT INTO public.users (id, email, full_name, phone, address, role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    'user'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error tapi jangan gagalkan signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 7: Buat trigger baru
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Grant permissions (penting untuk trigger)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- Step 9: Function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 10: Trigger untuk auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =======================================================
-- VERIFIKASI - Cek apakah setup berhasil
-- =======================================================

-- Cek 1: Apakah trigger ada dan aktif?
SELECT 
  'Trigger Status' as check_type,
  tgname as trigger_name,
  tgenabled as enabled,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ ACTIVE'
    ELSE '❌ DISABLED' 
  END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created'
  AND tgrelid = 'auth.users'::regclass;

-- Cek 2: Apakah function ada?
SELECT 
  'Function Status' as check_type,
  proname as function_name,
  prosecdef as is_security_definer,
  CASE 
    WHEN prosecdef THEN '✅ SECURITY DEFINER (Good!)'
    ELSE '⚠️ NOT SECURITY DEFINER (Bad!)'
  END as status
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Cek 3: List policies
SELECT 
  'Policy: ' || policyname as policy_info,
  cmd as for_command,
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN '✅ authenticated'
    WHEN roles::text LIKE '%service_role%' THEN '⚠️ service_role only'
    ELSE roles::text
  END as applies_to
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY cmd;

-- Cek 4: Jumlah user (seharusnya seimbang setelah trigger aktif)
SELECT 
  'User Count' as info,
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.users) as public_users,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.users) 
    THEN '✅ BALANCED'
    ELSE '⚠️ MISMATCH - Some users missing profile'
  END as status;

-- =======================================================
-- TROUBLESHOOTING: Jika masih ada user tanpa profile
-- =======================================================
-- Jalankan ini untuk membuat profile untuk user yang sudah ada:

INSERT INTO public.users (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  'user'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verifikasi lagi setelah fix
SELECT 
  'After Fix' as status,
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.users) as public_users;

-- =======================================================
-- SELESAI! 
-- =======================================================
-- Yang harus muncul:
-- ✅ Trigger ACTIVE
-- ✅ Function SECURITY DEFINER
-- ✅ 3 policies (SELECT, SELECT, UPDATE)
-- ✅ User count BALANCED
--
-- Sekarang test registrasi baru di website!
-- Jangan lupa konfirmasi email sebelum login!
-- =======================================================
