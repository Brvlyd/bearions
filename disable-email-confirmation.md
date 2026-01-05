# Disable Email Confirmation (Development Mode)

## ⚠️ PENTING - Setup Email Confirmation

Saat ini Supabase memerlukan email confirmation setelah registration. Ada 2 cara untuk handle ini:

---

## Option 1: Disable Email Confirmation (Recommended untuk Development)

### Langkah-langkah:

1. **Buka Supabase Dashboard**
   - Login ke https://supabase.com
   - Pilih project Bearions

2. **Navigate ke Authentication Settings**
   - Sidebar kiri → Authentication → Settings
   - Atau langsung ke: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/settings`

3. **Disable Email Confirmation**
   - Scroll ke bagian **"Email Auth"**
   - Cari setting **"Enable email confirmations"**
   - **UNCHECK/DISABLE** opsi ini
   - Klik **"Save"**

4. **Test Registration**
   - Sekarang user bisa langsung login tanpa confirm email
   - Data user akan langsung tersimpan ke database

---

## Option 2: Setup Email Confirmation (Production)

Jika ingin menggunakan email confirmation (recommended untuk production):

### A. Setup Email Templates

1. **Configure Email Templates**
   - Dashboard → Authentication → Email Templates
   - Customize "Confirm Signup" template

2. **Update Confirmation URL**
   ```html
   <!-- Email Template -->
   <a href="{{ .ConfirmationURL }}">Confirm your email</a>
   ```

### B. Handle Email Confirmation di App

Sudah diimplementasikan di `lib/auth.ts`:
- ✅ Mendeteksi jika email confirmation diperlukan
- ✅ Memberikan pesan yang jelas ke user
- ✅ Redirect ke login setelah konfirmasi

### C. Create Confirmation Page (Optional)

Buat page untuk handle redirect setelah confirm email:

```typescript
// app/auth/confirm/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'confirming' | 'success' | 'error'>('confirming')

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: window.location.hash.split('#')[1],
          type: 'email'
        })

        if (error) throw error

        setStatus('success')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } catch (error) {
        console.error('Confirmation error:', error)
        setStatus('error')
      }
    }

    confirmEmail()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        {status === 'confirming' && (
          <>
            <h1 className="text-2xl font-bold mb-4">Confirming your email...</h1>
            <p className="text-gray-600">Please wait</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold text-green-600 mb-4">Email confirmed!</h1>
            <p className="text-gray-600">Redirecting to login...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Confirmation failed</h1>
            <p className="text-gray-600">Please try again or contact support</p>
          </>
        )}
      </div>
    </div>
  )
}
```

---

## 🔍 Troubleshooting

### Problem: User tidak tersimpan di database

**Solution:**

1. **Cek apakah trigger `handle_new_user` sudah dijalankan:**

```sql
-- Jalankan di Supabase SQL Editor
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

2. **Jika trigger tidak ada, jalankan ini:**

```sql
-- Function untuk auto-create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, address, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'address', ''),
    'user'
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN new;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

3. **Verifikasi trigger berfungsi:**

```sql
-- Cek data di table users
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;

-- Cek user di auth.users
SELECT id, email, created_at, confirmed_at FROM auth.users ORDER BY created_at DESC LIMIT 5;
```

### Problem: "Email not confirmed" error

**Solutions:**

1. **Option A: Disable email confirmation** (lihat Option 1 di atas)

2. **Option B: Manual confirm di database** (temporary solution):

```sql
-- Confirm email manually untuk testing
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'test@example.com';
```

3. **Option C: Cek spam folder** untuk email confirmation

### Problem: "Invalid login credentials"

**Causes:**
- Email atau password salah
- User belum register
- Email belum di-confirm (jika confirmation enabled)

**Solution:**
1. Double-check email & password
2. Reset password jika lupa
3. Register account baru jika belum ada
4. Confirm email jika confirmation enabled

---

## 📝 Testing Checklist

Setelah disable email confirmation:

1. ✅ Register user baru
2. ✅ Cek di Supabase Dashboard → Table Editor → `users`
3. ✅ Cek data: full_name, phone, address tersimpan
4. ✅ Login dengan email & password
5. ✅ Cek session berhasil (redirect ke catalog)

---

## 🚀 Quick Fix Commands

```bash
# 1. Buka Supabase Dashboard
https://supabase.com/dashboard

# 2. Navigate ke Authentication → Settings

# 3. Disable "Enable email confirmations"

# 4. Test register & login
```

---

## ✅ Verification

Setelah disable email confirmation, test flow ini:

```
1. Register → Success (no email needed)
2. Auto redirect to login page
3. Login → Success
4. Check users table → Data tersimpan
5. Access protected pages → Works
```

**Status setelah fix: ✅ Ready to use!**
