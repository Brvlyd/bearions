-- Fix User Registration Issue
-- Jalankan ini di Supabase SQL Editor

-- 1. Check if users table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'users'
) as users_table_exists;

-- 2. Check if trigger exists
SELECT EXISTS (
   SELECT FROM pg_trigger 
   WHERE tgname = 'on_auth_user_created'
) as trigger_exists;

-- 3. Check existing policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'users';

-- 4. Re-create users table if needed
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

-- 5. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies to recreate
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Allow user insert on signup" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;

-- 7. Create policies
-- User bisa melihat data mereka sendiri
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- User bisa update data mereka sendiri
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Admin bisa melihat semua users
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- IMPORTANT: Policy untuk allow insert saat signup (via trigger)
CREATE POLICY "Enable insert for service role"
ON users FOR INSERT
TO service_role
WITH CHECK (true);

-- 8. Drop and recreate function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert user profile
  INSERT INTO public.users (id, email, full_name, phone, address, role)
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'address', ''),
    'user'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    phone = COALESCE(EXCLUDED.phone, users.phone),
    address = COALESCE(EXCLUDED.address, users.address),
    updated_at = NOW();
  
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$;

-- 9. Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 10. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.users TO service_role;

-- 11. Test: Check if everything is set up correctly
SELECT 
  'Trigger created' as status,
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 12. Verify policies
SELECT 
  'Policies created' as status,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'users';

-- Success message
SELECT 'User registration is now fixed! Test by creating a new account.' as message;
