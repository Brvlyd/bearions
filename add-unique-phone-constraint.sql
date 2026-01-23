-- ============================================
-- ADD UNIQUE CONSTRAINT FOR PHONE
-- ============================================
-- Pastikan phone number tidak bisa diduplikat
-- ============================================

-- 1. Add phone column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 2. Add phone column to admins table if not exists
ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 3. Add unique constraint untuk phone di users table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_phone_unique UNIQUE (phone);
  END IF;
END $$;

-- 4. Add unique constraint untuk phone di admins table  
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admins_phone_unique'
  ) THEN
    ALTER TABLE admins ADD CONSTRAINT admins_phone_unique UNIQUE (phone);
  END IF;
END $$;

-- DONE! Sekarang phone number tidak bisa diduplikat
