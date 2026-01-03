# 🐻 BEARIONS - Fashion E-commerce Website

Website komersial tata busana modern menggunakan Next.js 15 dan Supabase.

## ✨ Fitur

### User Features
- 🏠 Landing page dengan hero section yang menarik
- 🛍️ Halaman katalog dengan filter kategori dan pencarian
- 🔍 Sorting produk (Featured, Price, Name)
- 📱 Responsive design untuk semua perangkat
- 👕 Detail produk dengan informasi lengkap
- ✅ Akses tanpa login untuk browsing produk

### Admin Features
- 🔐 Login page khusus admin dengan autentikasi
- 📊 Dashboard admin dengan statistik produk
- ➕ Tambah produk baru
- ✏️ Edit produk existing
- 🗑️ Hapus produk
- 📦 Manajemen stok produk
- 👀 Monitor semua produk yang ada

## 🎨 Design

- **Color Scheme**: Black & White untuk estetika modern
- **Typography**: Inter font untuk clean look
- **UI Components**: Custom designed dengan Tailwind CSS
- **Icons**: Lucide React icons

## 🚀 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Supabase

1. Buat project baru di [Supabase](https://supabase.com)
2. Jalankan SQL script di `database-schema.sql` di Supabase SQL Editor
3. Copy kredensial Supabase Anda

### 3. Environment Variables

Copy `.env.local.example` ke `.env.local` dan isi dengan kredensial Supabase Anda:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Buat Admin User

Di Supabase:

1. Buka Authentication → Users
2. Buat user baru dengan email dan password
3. Copy User ID
4. Jalankan SQL:

```sql
INSERT INTO admins (id, email) VALUES ('user-id-dari-step-3', 'admin@email.com');
```

### 5. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 📁 Struktur Project

```
bearions/
├── app/
│   ├── admin/
│   │   ├── login/           # Admin login page
│   │   └── dashboard/       # Admin dashboard
│   │       ├── add-product/ # Tambah produk
│   │       └── edit-product/# Edit produk
│   ├── catalog/             # Halaman katalog user
│   ├── products/[id]/       # Detail produk
│   ├── community/           # Halaman community
│   ├── contact/             # Halaman contact
│   └── page.tsx            # Landing page
├── components/
│   ├── Header.tsx          # Navigation header
│   ├── ProductCard.tsx     # Product card component
│   └── CatalogView.tsx     # Catalog view component
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── auth.ts             # Authentication functions
│   └── products.ts         # Product CRUD functions
└── database-schema.sql     # Database schema
```

## 🔒 Authentication

- Admin harus login untuk akses dashboard
- User dapat browse tanpa login
- Session management dengan Supabase Auth
- Row Level Security (RLS) policies untuk database security

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

Untuk pertanyaan atau issues, hubungi team Bearions.

---

**Made with ❤️ for Bearions Fashion**

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
