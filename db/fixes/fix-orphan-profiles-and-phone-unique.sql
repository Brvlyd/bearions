-- =======================================================
-- FIX PROFIL ORPHAN + UNIQUE PHONE YANG MEMBLOKIR TRIGGER
-- Jalankan di Supabase SQL Editor.
-- =======================================================
--
-- Masalah:
--   handle_new_user() mengisi kolom phone dengan '' (string kosong) saat user
--   mendaftar tanpa nomor telepon. Kolom itu punya constraint UNIQUE, jadi hanya
--   SATU baris yang boleh bernilai ''. Pendaftar berikutnya tanpa nomor telepon
--   -- atau dengan nomor yang sudah dipakai orang lain -- membuat INSERT gagal.
--   Blok EXCEPTION di trigger menelan error itu diam-diam, sehingga akun tetap
--   dibuat di auth.users tapi TANPA baris di public.users.
--
-- Akibatnya user bisa lolos verifikasi email tetapi tidak bisa login:
--   signInWithPassword berhasil -> getUserWithRole tidak menemukan profil ->
--   login() mengembalikan null -> halaman login hanya menampilkan error generik.
--   User mengira dirinya belum terverifikasi lalu menekan "Kirim Ulang Email
--   Verifikasi" berulang kali, padahal akunnya sudah terverifikasi.
--
-- Perbaikan di bawah: simpan NULL (bukan '') untuk nomor kosong, dan pastikan
-- nomor telepon duplikat tidak lagi mengorbankan seluruh profil.
-- =======================================================

BEGIN;

-- Step 1: '' bukan nilai "kosong" bagi constraint UNIQUE, NULL iya.
UPDATE public.users  SET phone = NULL WHERE phone = '';
UPDATE public.admins SET phone = NULL WHERE phone = '';

-- Step 2: Trigger menyimpan NULL untuk nomor kosong, dan kalau nomornya bentrok
-- profil tetap dibuat tanpa nomor -- jauh lebih baik daripada tidak ada profil.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
BEGIN
  BEGIN
    INSERT INTO public.users (id, email, full_name, phone, address, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      v_phone,
      COALESCE(NEW.raw_user_meta_data->>'address', ''),
      'user'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN unique_violation THEN
      INSERT INTO public.users (id, email, full_name, phone, address, role)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NULL,
        COALESCE(NEW.raw_user_meta_data->>'address', ''),
        'user'
      )
      ON CONFLICT (id) DO NOTHING;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Backfill akun yang sudah terlanjur kehilangan profil. Nomor telepon
-- sengaja tidak diikutkan supaya bentrok lama tidak menggagalkan backfill.
INSERT INTO public.users (id, email, full_name, address, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  COALESCE(au.raw_user_meta_data->>'address', ''),
  'user'
FROM auth.users au
LEFT JOIN public.users  pu ON pu.id = au.id
LEFT JOIN public.admins ad ON ad.id = au.id
WHERE pu.id IS NULL
  AND ad.id IS NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =======================================================
-- VERIFIKASI
-- =======================================================

-- Harus mengembalikan 0 baris.
SELECT au.id, au.email, au.created_at AS masih_tanpa_profil
FROM auth.users au
LEFT JOIN public.users  pu ON pu.id = au.id
LEFT JOIN public.admins ad ON ad.id = au.id
WHERE pu.id IS NULL AND ad.id IS NULL;

-- Harus BALANCED.
SELECT
  (SELECT COUNT(*) FROM auth.users)     AS auth_users,
  (SELECT COUNT(*) FROM public.users)   AS public_users,
  (SELECT COUNT(*) FROM public.admins)  AS admins,
  CASE
    WHEN (SELECT COUNT(*) FROM auth.users)
       = (SELECT COUNT(*) FROM public.users) + (SELECT COUNT(*) FROM public.admins)
    THEN 'BALANCED'
    ELSE 'MISMATCH'
  END AS status;
