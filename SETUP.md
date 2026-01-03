# 📋 SETUP INSTRUCTIONS - BEARIONS

## Langkah 1: Install Dependencies ✅

Sudah selesai! Dependencies sudah terinstall.

## Langkah 2: Setup Supabase Database 🗄️

### 2.1 Buat Project Supabase

1. Kunjungi [https://supabase.com](https://supabase.com)
2. Sign up / Login
3. Klik "New Project"
4. Isi:
   - **Project Name**: bearions
   - **Database Password**: Buat password yang kuat (SIMPAN!)
   - **Region**: Pilih yang terdekat
5. Tunggu project selesai dibuat (~2 menit)

### 2.2 Setup Database

1. Di dashboard Supabase, klik **SQL Editor** di sidebar
2. Klik **New Query**
3. Copy seluruh isi file `database-schema.sql` 
4. Paste ke SQL Editor
5. Klik **Run** atau tekan `Ctrl+Enter`
6. Pastikan muncul "Success. No rows returned"

### 2.3 Dapatkan Credentials

1. Di dashboard Supabase, klik **Settings** (ikon gear) di sidebar
2. Klik **API**
3. Copy informasi berikut:
   - **Project URL** (di bawah "Project URL")
   - **anon public** key (di bawah "Project API keys")

## Langkah 3: Setup Environment Variables 🔐

1. Buka file `.env.local` di root project
2. Ganti placeholder dengan kredensial Supabase Anda:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **PENTING**: Jangan commit file `.env.local` ke Git!

## Langkah 4: Buat Admin User 👤

### 4.1 Buat User di Supabase Auth

1. Di dashboard Supabase, klik **Authentication** di sidebar
2. Klik **Users** tab
3. Klik **Add user** → **Create new user**
4. Isi:
   - **Email**: admin@bearions.com (atau email pilihan Anda)
   - **Password**: Buat password yang kuat
   - **Auto Confirm User**: ✅ Centang ini
5. Klik **Create user**
6. **COPY USER ID** dari kolom UID (contoh: `12345678-1234-1234-1234-123456789abc`)

### 4.2 Daftarkan sebagai Admin

1. Kembali ke **SQL Editor**
2. Buat query baru dan jalankan:

```sql
INSERT INTO admins (id, email) 
VALUES ('PASTE-USER-ID-DISINI', 'admin@bearions.com');
```

Ganti `PASTE-USER-ID-DISINI` dengan User ID yang Anda copy di step 4.1

3. Klik **Run**
4. Pastikan muncul "Success"

## Langkah 5: Run Development Server 🚀

```bash
npm run dev
```

Buka browser dan kunjungi:
- **Homepage**: [http://localhost:3000](http://localhost:3000)
- **Catalog**: [http://localhost:3000/catalog](http://localhost:3000/catalog)
- **Admin Login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Langkah 6: Test Admin Features 🧪

1. Kunjungi [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
2. Login dengan email dan password yang Anda buat di Langkah 4
3. Setelah login, Anda akan masuk ke Admin Dashboard
4. Test fitur-fitur:
   - ✅ View semua products
   - ✅ Add new product
   - ✅ Edit product
   - ✅ Update stock
   - ✅ Delete product

## 🎉 Selesai!

Website Bearions Anda sudah siap digunakan!

### Fitur yang Tersedia:

**User (Tanpa Login):**
- ✅ Browse catalog
- ✅ Search & filter products
- ✅ View product details
- ✅ Sort products

**Admin (Dengan Login):**
- ✅ Full product management (CRUD)
- ✅ Stock management
- ✅ View statistics
- ✅ Monitor all products

## 📝 Notes

- Sample products sudah dibuat otomatis dari SQL script
- Anda bisa hapus atau edit sample products via admin dashboard
- Untuk menambahkan admin lain, ulangi Langkah 4
- Database sudah dilengkapi dengan Row Level Security (RLS) untuk keamanan

## 🐛 Troubleshooting

**Error: Invalid supabaseUrl**
- Pastikan Anda sudah isi `.env.local` dengan benar
- Restart development server setelah mengubah env variables

**Cannot login**
- Pastikan user sudah didaftarkan di `admins` table
- Check email dan password benar
- Cek di Supabase Dashboard → Authentication → Users

**Products tidak muncul**
- Pastikan SQL script sudah dijalankan
- Check di Supabase Dashboard → Table Editor → products

## 📞 Need Help?

Jika ada masalah, cek:
1. Console browser (F12) untuk errors
2. Terminal untuk server errors
3. Supabase Dashboard → Logs untuk database errors

---

**Happy coding! 🚀**
