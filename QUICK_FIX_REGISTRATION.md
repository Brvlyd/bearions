# 🔧 Fix Registrasi User - Panduan Cepat

## ❌ Masalah
User baru tidak tersimpan di database, muncul error:
```
406 Not Acceptable
401 Unauthorized  
Error: new row violates row-level security policy
```

## ✅ Solusi (2 Langkah)

### Langkah 1: Jalankan SQL di Supabase (WAJIB!)

1. **Buka Supabase Dashboard** → SQL Editor
2. **Copy isi file `fix-registration-final.sql`**
3. **Paste & Run**
4. **Cek hasil**: Harus muncul `✅ Trigger ACTIVE`

### Langkah 2: Test Registrasi

1. Buka `localhost:3000/register`
2. Isi form & submit
3. **Cek email** untuk konfirmasi
4. Klik link konfirmasi
5. Login

## 📋 Verifikasi

Jalankan di Supabase SQL Editor:
```sql
-- Cek trigger aktif
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Cek jumlah user (harus sama)
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.users) as public_users;
```

## ⚠️ Troubleshooting

### User sudah terdaftar tapi tidak ada di tabel users?
Jalankan SQL ini untuk fix:
```sql
INSERT INTO public.users (id, email, full_name, role)
SELECT 
  au.id, au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  'user'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

### Masih error 401/406?
- Pastikan SQL sudah dijalankan dengan benar
- Cek trigger aktif (query di atas)
- Restart dev server: `Ctrl+C` → `npm run dev`
- Clear browser cache & reload

## 🎯 Yang Diperbaiki

**Kode (✅ Sudah otomatis):**
- `lib/auth.ts` - Mengandalkan trigger, tidak insert manual

**Database (⏳ Perlu dijalankan):**
- Trigger otomatis buat profile user
- RLS policies yang benar
- Permissions yang tepat

## 📝 Catatan

- User **HARUS** konfirmasi email sebelum login
- Trigger berjalan otomatis saat registrasi
- Tidak perlu kode tambahan, semua di database
- Lebih aman dengan Row Level Security

---

**Status:**
- ✅ Kode diperbaiki
- ⏳ SQL perlu dijalankan di Supabase
- ⏳ Test registrasi baru

Butuh bantuan? Cek `FIX_REGISTRATION_COMPLETE.md` untuk panduan lengkap.
