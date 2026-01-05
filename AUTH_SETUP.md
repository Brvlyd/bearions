# Authentication System Setup

Sistem autentikasi untuk Bearions telah dibuat dengan dukungan untuk **Admin** dan **User**.

## 🚀 Setup Database

### 1. Jalankan SQL Schema di Supabase

Jalankan file SQL berikut di Supabase SQL Editor secara berurutan:

1. **database-schema.sql** (jika belum)
2. **users-schema.sql** (file baru)

File `users-schema.sql` akan membuat:
- Table `users` untuk menyimpan data user biasa
- Policies untuk row-level security
- Trigger untuk auto-create user profile setelah signup
- Update table `admins` dengan field tambahan

### 2. Buat Admin Account Manual (Opsional)

Jika Anda ingin membuat akun admin, jalankan SQL berikut di Supabase:

```sql
-- Insert admin ke auth.users dulu (lewat Supabase Auth UI atau signup biasa)
-- Kemudian tambahkan ke table admins:
INSERT INTO admins (id, email, role, full_name)
VALUES ('USER_ID_FROM_AUTH', 'admin@bearions.com', 'admin', 'Admin Name');
```

Atau gunakan Supabase Dashboard:
1. Buka Authentication > Users
2. Add user > masukkan email & password
3. Copy user ID
4. Buka SQL Editor > jalankan INSERT query di atas

## 📋 Halaman yang Tersedia

### User Pages
- `/register` - Halaman registrasi user baru
- `/login` - Halaman login untuk user
- `/profile` - Halaman profile user (setelah login)
- `/catalog` - Katalog produk (untuk user yang sudah login)

### Admin Pages
- `/admin/login` - Halaman login khusus admin
- `/admin/dashboard` - Dashboard admin (protected)
- `/admin/dashboard/products` - Manage products
- `/admin/dashboard/add-product` - Add new product
- `/admin/dashboard/edit-product/[id]` - Edit product

## 🔐 Fitur Authentication

### 1. **User Registration**
- Email & password (required)
- Full name, phone, address (optional)
- Auto-create profile di table `users`
- Email verification (Supabase default)

### 2. **User Login**
- Login dengan email & password
- Redirect ke `/catalog` setelah login
- Validasi role user

### 3. **Admin Login**
- Login terpisah di `/admin/login`
- Hanya admin yang bisa akses dashboard
- Redirect ke `/admin/dashboard` setelah login

### 4. **Role-Based Access**
- Admin: akses ke `/admin/*` routes
- User: akses ke profile dan catalog
- Guest: akses ke home, catalog (view only)

### 5. **Header Navigation**
Otomatis berubah berdasarkan status login:
- **Not logged in**: Sign in + Sign up button
- **Logged in as User**: Profile + Logout
- **Logged in as Admin**: Dashboard + Logout

## 🛡️ Security Features

1. **Row Level Security (RLS)** - Enabled di semua tables
2. **Role Validation** - Cek role saat login
3. **Protected Routes** - Admin layout menggunakan middleware
4. **Auto Logout** - Jika access denied
5. **Password Requirements** - Minimum 6 karakter

## 🔄 Authentication Flow

### User Flow:
1. User register di `/register`
2. Verify email (jika enabled di Supabase)
3. Login di `/login`
4. Redirect ke `/catalog`
5. Akses profile di `/profile`

### Admin Flow:
1. Admin account dibuat manual di Supabase
2. Login di `/admin/login`
3. Redirect ke `/admin/dashboard`
4. Manage products

## 📝 API Methods (auth.ts)

```typescript
// Register user baru
authService.register({
  email: string,
  password: string,
  full_name?: string,
  phone?: string,
  address?: string
})

// Login (auto-detect role atau specify)
authService.login({ email, password }, 'user' | 'admin')

// Get current user dengan role
authService.getCurrentUser()

// Check if admin
authService.isAdmin()

// Get user profile
authService.getUserProfile()

// Update user profile
authService.updateUserProfile(updates)

// Logout
authService.logout()
```

## 🎯 Next Steps

1. **Setup Supabase Storage** untuk product images (sudah ada)
2. **Email Templates** - Customize di Supabase Auth settings
3. **Password Reset** - Implement forgot password
4. **Profile Edit** - Lengkapi halaman profile user
5. **Order System** - Tambah fitur order untuk user

## ⚙️ Configuration

Pastikan Supabase credentials sudah di-setup di:
- `lib/supabase.ts`
- Environment variables jika ada

## 📱 Testing

### Test User Registration:
1. Buka `/register`
2. Isi form & submit
3. Check email untuk verification (optional)
4. Login di `/login`

### Test Admin Login:
1. Buat admin account di Supabase
2. Buka `/admin/login`
3. Login dengan admin credentials
4. Access `/admin/dashboard`

## 🐛 Troubleshooting

**User tidak bisa register:**
- Cek apakah `users-schema.sql` sudah dijalankan
- Cek trigger `on_auth_user_created` sudah ada
- Cek Supabase Auth settings (email confirmation enabled/disabled)

**Admin tidak bisa login:**
- Pastikan user ID ada di table `admins`
- Cek RLS policies di Supabase

**Image upload error:**
- Cek `next.config.ts` sudah ada Supabase hostname
- Restart dev server setelah update config
