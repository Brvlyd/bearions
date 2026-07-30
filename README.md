# 🐻 Bearion - Modern E-commerce Platform

Website e-commerce modern untuk clothing brand Bearion, dibangun dengan Next.js 16, TypeScript, dan Supabase.

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)

## 🚀 Features

### User Features
- 🛍️ **Product Catalog** - Browse products dengan kategori
- 🎠 **Image Carousel** - Multiple images per product dengan auto-rotate
- 🔍 **Product Search & Filter** - Cari produk dengan mudah
- 👤 **User Authentication** - Register & login untuk user
- 📱 **Responsive Design** - Mobile-friendly interface
- 🏠 **Modern Landing Page** - Hero section yang menarik

### Admin Features
- 🔐 **Admin Dashboard** - Kelola produk dan inventory
- 📸 **Multi-Image Upload** - Upload multiple images dengan drag & drop
- ✏️ **Product Management** - CRUD operations untuk products
- 🎯 **Role-Based Access** - Admin dan user terpisah
- 📊 **Stock Management** - Track inventory real-time
- 🖼️ **Image Reordering** - Atur urutan tampilan gambar

## 📋 Prerequisites

Sebelum setup, pastikan kamu punya:

- **Node.js** (versi 18 atau lebih baru)
- **npm** / **yarn** / **pnpm**
- **Git** untuk clone repository
- **Akun Supabase** (gratis) - [supabase.com](https://supabase.com)

## 🛠️ Setup di Device Baru

### 1. Clone Repository

```bash
git clone https://github.com/Brvlyd/bearion.git
cd bearion
```

### 2. Install Dependencies

Pilih salah satu package manager:

```bash
```bash
# Menggunakan npm
npm install

# Atau menggunakan yarn
yarn install

# Atau menggunakan pnpm
pnpm install
```

### 3. Setup Supabase

#### a. Buat Project Baru di Supabase
1. Login ke [supabase.com](https://supabase.com)
2. Klik "New Project"
3. Isi nama project, database password, dan region
4. Tunggu project selesai dibuat (~2 menit)

#### b. Dapatkan Credentials
1. Buka project yang baru dibuat
2. Klik **Settings** → **API**
3. Copy:
   - **Project URL** (contoh: https://xxx.supabase.co)
   - **anon/public key**

#### c. Create Storage Bucket
1. Buka **Storage** di sidebar
2. Klik **New bucket**
3. Nama bucket: `product-images`
4. **Public bucket**: ✅ Centang
5. Klik **Create bucket**

#### d. Run SQL Schemas
1. Buka **SQL Editor** di sidebar
2. Klik **New query**
3. Copy & paste isi file berikut secara berurutan:
   - `database-schema.sql` → Run
   - `users-schema.sql` → Run
   - `product-images-schema.sql` → Run

### 4. Environment Variables

Buat file `.env.local` di root folder:

```bash
# Copy dari .env.example (jika ada)
cp .env.example .env.local
```

Edit `.env.local` dan isi dengan credentials Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**⚠️ PENTING**: Ganti dengan credentials project kamu!

### 5. Update Next.js Config

Edit `next.config.ts` dan ganti hostname Supabase dengan project kamu:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'your-project.supabase.co', // Ganti ini!
      pathname: '/storage/v1/object/public/**',
    },
  ],
},
```

### 6. Run Development Server

```bash
npm run dev
```

Buka browser dan akses: **http://localhost:3000**

## 🎯 Setup Admin Account

Setelah database sudah jalan, buat admin account:

### 1. Signup Dulu di Aplikasi
1. Buka http://localhost:3000/register
2. Register dengan email & password
3. Verify email (kalau diminta)

### 2. Tambahkan ke Admins Table
1. Buka **Supabase Dashboard**
2. Klik **Authentication** → **Users**
3. Copy **User ID** dari user yang baru dibuat
4. Buka **SQL Editor**
5. Run query ini:

```sql
INSERT INTO admins (id, email, role, full_name)
VALUES (
  'paste-user-id-disini',
  'admin@bearion.com',
  'admin',
  'Admin Name'
);
```

Sekarang bisa login sebagai admin di `/login`!

## 📁 Project Structure

```
bearion/
├── app/                          # Next.js App Router
│   ├── admin/                   # Admin pages
│   │   ├── dashboard/          # Admin dashboard
│   │   ├── login/              # Admin login (redirect)
│   │   └── layout.tsx          # Admin layout with auth
│   ├── catalog/                # Product catalog
│   ├── login/                  # User & admin login
│   ├── register/               # User registration
│   ├── products/[id]/          # Product detail
│   └── profile/                # User profile
├── components/                  # React components
│   ├── Header.tsx              # Navigation
│   ├── ProductCard.tsx         # Product card with carousel
│   ├── ImageCarousel.tsx       # Auto-rotating carousel
│   ├── MultiImageUpload.tsx    # Multi-image uploader
│   └── CatalogView.tsx         # Catalog view
├── lib/                         # Utilities & services
│   ├── supabase.ts             # Supabase client
│   ├── auth.ts                 # Authentication service
│   └── products.ts             # Product service
├── public/                      # Static assets
├── database-schema.sql          # Main database schema
├── users-schema.sql            # Users & auth schema
├── product-images-schema.sql   # Multi-image schema
└── package.json                # Dependencies
```

## 🔐 Authentication

- **Admin**: Login di `/login` (auto-detect role)
- **User**: Register di `/register`, login di `/login`
- **Session**: Managed oleh Supabase Auth
- Row Level Security (RLS) policies untuk database security

## 🎨 Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## 📱 Available Scripts

```bash
# Development
npm run dev          # Start dev server (localhost:3000)

# Production
npm run build        # Build untuk production
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint
```

## 🌐 Deployment

### Deploy ke Vercel (Recommended)

1. Push code ke GitHub
2. Buka [vercel.com](https://vercel.com)
3. Import repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

**Catatan**: Jangan lupa set environment variables di platform deployment!

## 🐛 Troubleshooting

### Image tidak muncul
- ✅ Cek hostname di `next.config.ts`
- ✅ Cek bucket `product-images` sudah public
- ✅ Restart dev server setelah update config

### Login gagal
- ✅ Cek SQL schema sudah dijalankan
- ✅ Cek email sudah verified (kalau enabled)
- ✅ Cek user/admin sudah ada di database

### Build error
- ✅ Cek Node.js version (minimal 18)
- ✅ Delete folder `.next` dan `node_modules`
- ✅ Run `npm install` ulang

### Database error
- ✅ Cek Supabase project masih aktif
- ✅ Cek credentials di `.env.local` benar
- ✅ Cek RLS policies sudah di-setup

## 📚 Documentation

- [AUTH_SETUP.md](AUTH_SETUP.md) - Authentication system guide
- [MULTI_IMAGE_SETUP.md](MULTI_IMAGE_SETUP.md) - Multi-image feature guide
- [FEATURES.md](FEATURES.md) - Complete feature list

## 🎯 Quick Start Checklist

- [ ] Clone repository
- [ ] Install dependencies (`npm install`)
- [ ] Create Supabase project
- [ ] Create storage bucket `product-images`
- [ ] Run all SQL schemas
- [ ] Create `.env.local` dengan credentials
- [ ] Update `next.config.ts` hostname
- [ ] Run `npm run dev`
- [ ] Create admin account
- [ ] Test upload product dengan images
- [ ] Test carousel di product detail

## 📞 Contact

- **Developer**: Brvlyd
- **Repository**: [github.com/Brvlyd/bearion](https://github.com/Brvlyd/bearion)

---

Made with ❤️ using Next.js & Supabase

## 🗄️ Database Schema

### Products Table
- id (UUID)
- name (VARCHAR)
- description (TEXT)
- price (DECIMAL)
- stock (INTEGER)
- category (VARCHAR)
- image_url (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Admins Table
- id (UUID, foreign key ke auth.users)
- email (VARCHAR)
- created_at (TIMESTAMP)

## 📝 Usage

### User Flow
1. Kunjungi homepage → Browse catalog
2. Filter by category atau search
3. Sort products
4. Click product untuk detail
5. View availability dan info lengkap

### Admin Flow
1. Login di `/admin/login`
2. View dashboard dengan stats
3. Add/Edit/Delete products
4. Update stock levels
5. Monitor semua produk

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## 📦 Sample Data

Database schema sudah include sample products. Anda bisa:
- Modify di SQL script
- Atau hapus dan tambah via admin dashboard

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Jangan lupa set environment variables di Vercel dashboard!

## 📞 Support

Untuk pertanyaan atau issues, hubungi team Bearion.

---

**Made with ❤️ for Bearion Fashion**

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
