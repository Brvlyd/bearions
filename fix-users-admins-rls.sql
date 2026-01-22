-- ============================================
-- FIX 500 ERROR - Setup RLS for Users & Admins
-- ============================================
-- Error: 500 Internal Server Error pada users dan admins
-- Solusi: Perbaiki RLS policies
-- ============================================

-- ============================================
-- 1. FIX USERS TABLE RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON users;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. FIX ADMINS TABLE RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can view admins table" ON admins;
DROP POLICY IF EXISTS "Admins can update own profile" ON admins;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON admins;

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can check if they are admin
-- (Diperlukan untuk login flow - check admin status)
CREATE POLICY "Users can check admin status"
ON admins FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Admins can update their own profile
CREATE POLICY "Admins can update own profile"
ON admins FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- 3. VERIFY TABLES EXIST
-- ============================================
-- Cek apakah users dan admins table sudah ada

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admins table if not exists
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- ============================================
-- DONE! Coba login lagi
-- ============================================
