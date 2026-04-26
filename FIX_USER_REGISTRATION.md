# 🔧 Fix User Registration - Users Tidak Masuk Database

## ❌ Masalah
User yang daftar tidak masuk ke database `users` table.

## 🎯 Penyebab

1. **Trigger tidak jalan** - Function `handle_new_user()` tidak ter-trigger saat signup
2. **RLS Policy terlalu ketat** - Policy block INSERT dari service role
3. **Missing permissions** - Service role tidak punya permission INSERT
4. **Timing issue** - Code cek user terlalu cepat sebelum trigger selesai

## ✅ SOLUSI - Jalankan 3 Langkah Ini

### STEP 1: Fix Database (2 menit)

**Buka Supabase Dashboard → SQL Editor**

Copy-paste SELURUH isi file `fix-user-registration.sql`:

```sql
-- File ada di: fix-user-registration.sql
-- Copy seluruh isinya dan run di Supabase SQL Editor
```

Klik **"Run"** ✅

### STEP 2: Verify Fix Berhasil

Setelah run SQL, check output:

```
✅ Trigger created: on_auth_user_created
✅ Policies created: 
   - Users can view own profile
   - Users can update own profile
   - Admins can view all users
   - Enable insert for service role
✅ Message: "User registration is now fixed!"
```

### STEP 3: Test Registration

1. **Clear browser data** (cache & cookies)
2. **Restart dev server:**
   ```bash
   npm run dev
   ```
3. **Test register:**
   - Go to http://localhost:3000/register
   - Fill form dan submit
   - Check Supabase Dashboard → Table Editor → users
   - ✅ User baru harus muncul!

## 🔍 Verify di Supabase

### Check Users Table
```sql
SELECT id, email, full_name, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Auth.Users
```sql
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;
```

Harusnya sama jumlahnya!

### Check Trigger
```sql
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

Output: `on_auth_user_created | auth.users`

## 🛠️ Apa yang Diperbaiki

### 1. Database Trigger
- ✅ Re-create trigger function dengan error handling
- ✅ Added ON CONFLICT untuk handle duplicate
- ✅ Better error logging
- ✅ SECURITY DEFINER untuk bypass RLS

### 2. RLS Policies
- ✅ Added policy untuk service_role INSERT
- ✅ Fixed policy conditions
- ✅ Proper permissions granted

### 3. Backend Code (lib/auth.ts)
- ✅ Increased wait time (2 detik)
- ✅ Check if profile exists sebelum update
- ✅ Manual insert jika trigger gagal
- ✅ Better error handling
- ✅ Tidak throw error jika profile creation gagal

## 🧪 Test Cases

### Test 1: Normal Registration
```
1. Register dengan:
   - Email: test@example.com
   - Password: test123
   - Full Name: Test User
   - Phone: 081234567890

2. Check database:
   SELECT * FROM users WHERE email = 'test@example.com';

Expected: ✅ User exists dengan full data
```

### Test 2: Minimal Registration
```
1. Register dengan hanya:
   - Email: minimal@test.com
   - Password: test123
   - Full Name: Min User

2. Check database:
   SELECT * FROM users WHERE email = 'minimal@test.com';

Expected: ✅ User exists, full_name = 'Min User'
```

### Test 3: Check Auth Sync
```sql
-- Both tables should have same user count
SELECT COUNT(*) FROM auth.users;
SELECT COUNT(*) FROM public.users;
```

## ❓ Troubleshooting

### Problem: Trigger masih tidak jalan

**Check function exists:**
```sql
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
```

**Re-create manually:**
```sql
-- Run seluruh isi fix-user-registration.sql lagi
```

### Problem: Policy error "insufficient privileges"

**Grant permissions:**
```sql
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.admins TO service_role;
```

### Problem: User sudah signup tapi tidak ada di `users` table

**Manual insert existing auth users:**
```sql
-- Insert semua auth.users yang belum ada di public.users
INSERT INTO public.users (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'user'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.email NOT IN (SELECT email FROM admins);
```

### Problem: Registration berhasil tapi data kosong

**Update existing users:**
```sql
UPDATE users u
SET 
  full_name = COALESCE(
    u.full_name,
    (SELECT au.raw_user_meta_data->>'full_name' 
     FROM auth.users au WHERE au.id = u.id)
  ),
  phone = COALESCE(
    u.phone,
    (SELECT au.raw_user_meta_data->>'phone' 
     FROM auth.users au WHERE au.id = u.id)
  )
WHERE full_name IS NULL OR full_name = '';
```

## 📊 Monitoring

### Check Registration Success Rate

```sql
-- Compare auth.users vs public.users
WITH auth_count AS (
  SELECT COUNT(*) as total FROM auth.users
),
users_count AS (
  SELECT COUNT(*) as total FROM public.users
)
SELECT 
  a.total as auth_users,
  u.total as public_users,
  (u.total::float / a.total * 100)::numeric(5,2) as success_rate_percent
FROM auth_count a, users_count u;
```

Expected: ~100% success rate

### Check Recent Registrations

```sql
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created,
  pu.created_at as users_created,
  CASE 
    WHEN pu.id IS NOT NULL THEN '✅ Synced'
    ELSE '❌ Missing'
  END as status
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 20;
```

## 🎉 Expected Results

### After Fix:
```
✅ Trigger berjalan otomatis
✅ User masuk ke database instant
✅ Full name, phone, address tersimpan
✅ RLS policies bekerja
✅ User bisa login normal
✅ Admin bisa lihat users
```

### Logs:
```
Console (saat register):
✅ Registration successful
✅ User profile created
✅ No errors in console

Supabase Logs:
✅ INSERT INTO users executed
✅ Trigger fired successfully
```

## 🚀 Production Checklist

Sebelum launch:

- [ ] Run `fix-user-registration.sql` di Supabase
- [ ] Test 3-5 registrations
- [ ] Verify semua data masuk
- [ ] Check RLS policies bekerja
- [ ] Test login setelah register
- [ ] Test admin view users
- [ ] Monitor error logs
- [ ] Setup email confirmation (optional)

## 📞 Quick Commands

```sql
-- Check status
SELECT COUNT(*) FROM auth.users; -- Total signups
SELECT COUNT(*) FROM users;      -- Total in database
SELECT COUNT(*) FROM admins;     -- Total admins

-- Find orphaned auth users (tidak ada di users table)
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- Fix orphaned users
INSERT INTO users (id, email, full_name, role)
SELECT au.id, au.email, au.email, 'user'
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;
```

---

## 🎯 TL;DR - Super Quick Fix

```bash
# 1. Buka Supabase → SQL Editor
# 2. Run fix-user-registration.sql (copy paste semua)
# 3. Restart dev server
npm run dev
# 4. Test register di /register
# 5. Check Supabase → users table
# ✅ FIXED!
```

---

**Status**: ✅ READY TO FIX
**Time**: 2-3 minutes
**Difficulty**: ⭐ Easy
**Impact**: 🚀 Critical (fix registration!)

**File yang diupdate:**
- ✅ `fix-user-registration.sql` - Database fix
- ✅ `lib/auth.ts` - Backend fallback logic
