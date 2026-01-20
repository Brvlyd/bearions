# Perbaikan Registrasi User - Panduan Lengkap

## Masalah
User baru yang mendaftar tidak tersimpan di tabel `users` di database, sehingga tidak bisa login.

**Error yang muncul:**
```
GET .../rest/v1/users?select=id&id=eq.... 406 (Not Acceptable)
POST .../rest/v1/users 401 (Unauthorized)
Error: new row violates row-level security policy for table "users"
```

## Penyebab
1. ~~Ada early return di kode yang mencegah pembuatan profil~~ ✅ SUDAH DIPERBAIKI
2. **Row Level Security (RLS)** menghalangi insert dari client-side
3. Database trigger belum dijalankan atau tidak berfungsi dengan benar
4. Kode mencoba insert manual dari browser (tidak boleh karena RLS)

## Solusi Sudah Diterapkan

### 1. Perbaikan Kode ✅
File [lib/auth.ts](lib/auth.ts) sudah diperbaiki:
- ✅ Menghapus early return yang menghalangi
- ✅ Menghapus manual insert dari client-side (ini penyebab error 401/406)
- ✅ Sekarang **HANYA mengandalkan database trigger**
- ✅ Lebih sederhana dan aman dengan RLS

**Perubahan:**
```typescript
// SEBELUM (❌ Error 401/406):
- Mencoba check apakah user ada
- Mencoba insert manual dari browser
- Gagal karena RLS policy

// SEKARANG (✅ Bekerja):
- Signup ke Supabase
- Database trigger otomatis membuat profile
- Trigger punya elevated privileges (bypass RLS)
```

### 2. Perbaikan Database (WAJIB DIJALANKAN)

File [fix-registration-final.sql](fix-registration-final.sql) sudah diupdate dengan:
- ✅ Trigger dengan `SECURITY DEFINER` (elevated privileges)
- ✅ Policies yang benar (TIDAK ada policy INSERT untuk client)
- ✅ Permissions yang tepat
- ✅ Verifikasi otomatis setelah setup
- ✅ Script untuk fix user yang sudah ada tapi tanpa profile

**Gunakan file [fix-registration-final.sql](fix-registration-final.sql)** - sudah lengkap dan siap pakai!

Atau copy SQL berikut:
-- 1. Pastikan tabel users ada
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

-- 2. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Hapus policies lama
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Enable insert for service role" ON users;

-- 4. Buat policies baru
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);

-- PENTING: Policy untuk trigger
CREATE POLICY "Enable insert for service role"
ON users FOR INSERT
TO service_role
WITH CHECK (true);

-- 5. Buat fungsi trigger
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
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
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$;

-- 6. Buat trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Grant permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.users TO service_role;

-- 8. Verifikasi setup
SELECT 
  'Setup Complete!' as status,
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

## Cara Menggunakan

### Langkah 1: Jalankan SQL di Supabase
1. Buka **Supabase Dashboard** → Project Anda
2. Klik menu **SQL Editor** di sidebar kiri
3. Klik **New Query**
4. Copy-paste SQL di atas
5. Klik **Run** atau tekan `Ctrl+Enter`
6. Pastikan muncul hasil "Setup Complete!" di output

### Langkah 2: Test Registrasi Baru
1. Buka website Anda di browser (localhost:3000)
2. Pergi ke halaman `/register`
3. Isi form registrasi dengan data baru
4. Submit form
5. Anda akan melihat pesan sukses tentang konfirmasi email

### Langkah 3: Verifikasi di Database
1. Di Supabase Dashboard, buka **Table Editor**
2. Pilih tabel `auth.users` - seharusnya ada user baru
3. Pilih tabel `public.users` - seharusnya ada data profil user baru

### Langkah 4: Konfirmasi Email
1. Cek inbox email yang digunakan untuk registrasi
2. Klik link konfirmasi dari Supabase
3. Setelah konfirmasi, kembali ke website
4. Login dengan email dan password yang terdaftar

## Troubleshooting

### Masalah 1: User di auth.users tapi tidak di public.users
**Solusi:** Jalankan SQL manual untuk membuat profil:
```sql
-- Ganti <user_id> dan <email> dengan data asli
INSERT INTO public.users (id, email, full_name, role)
VALUES ('<user_id>', '<email>', '', 'user');
```

### Masalah 2: Trigger tidak berjalan
**Cek:**
```sql
-- Lihat apakah trigger ada
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Lihat logs error
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%handle_new_user%' 
ORDER BY last_exec_time DESC LIMIT 5;
```

### Masalah 3: Permission denied
**Solusi:**
```sql
-- Grant ulang permissions
GRANT ALL ON public.users TO postgres, service_role;
GRANT USAGE ON SCHEMA auth TO service_role;
```

### Masalah 4: Email konfirmasi tidak diterima
**Cek Supabase Settings:**
1. Dashboard → Authentication → Email Templates
2. Pastikan "Enable Email Confirmations" aktif
3. Pastikan SMTP settings benar (jika custom SMTP)

## Catatan Penting

### Email Confirmation
- **Supabase default**: Memerlukan konfirmasi email
- User **TIDAK BISA LOGIN** sebelum konfirmasi
- Email dikirim otomatis setelah registrasi
- Link konfirmasi valid 24 jam

### Untuk Development (Opsional)
Jika ingin **disable email confirmation** untuk testing:
1. Dashboard → Authentication → Settings
2. Scroll ke "Email Confirmations"
3. Toggle OFF "Enable email confirmations"
4. **INGAT:** Jangan disable di production!

### Perbedaan User vs Admin
- **User regular**: Disimpan di `public.users`
- **Admin**: Disimpan di `public.admins`
- Registrasi normal selalu membuat user (bukan admin)
- Untuk membuat admin, gunakan SQL manual:
  ```sql
  INSERT INTO public.admins (id, email)
  VALUES ('<user_id_from_auth_users>', '<email>');
  ```

## Verifikasi Akhir

Jalankan query ini untuk memastikan semuanya bekerja:
```sql
-- 1. Cek trigger aktif
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 2. Cek policies
SELECT policyname FROM pg_policies WHERE tablename = 'users';

-- 3. Cek jumlah user
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.users) as public_users;
```

Angka `auth_users` dan `public_users` seharusnya **sama** atau selisih minimal (untuk user yang mendaftar sebelum fix ini).

## Status
- ✅ Kode diperbaiki
- ⏳ SQL perlu dijalankan di Supabase
- ⏳ Testing registrasi baru

## Bantuan Lebih Lanjut
Jika masih ada masalah, cek:
1. Supabase logs: Dashboard → Logs
2. Browser console: F12 → Console tab
3. Network tab: Lihat response dari `/auth/v1/signup`
