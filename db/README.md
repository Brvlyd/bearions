# Database Scripts

Semua script di sini dijalankan lewat **Supabase Dashboard → SQL Editor**. Tidak ada
migration runner otomatis, jadi urutan di bawah ini yang jadi acuan.

## Struktur

| Folder        | Isi                                                                  |
| ------------- | -------------------------------------------------------------------- |
| `schema/`     | Definisi tabel awal. Dijalankan sekali saat setup database baru.      |
| `migrations/` | Perubahan schema setelah setup (kolom baru, policy baru, rename).     |
| `fixes/`      | Script perbaikan untuk database yang sudah terlanjur salah state.     |
| `checks/`     | Query verifikasi, tidak mengubah data.                                |

## Setup database baru

Jalankan berurutan dari `schema/`:

1. `database-schema.sql` — tabel products
2. `users-schema.sql` — users & admins
3. `product-images-schema.sql` — multi-image per produk
4. `categories-schema.sql` — kategori produk
5. `cart-orders-schema.sql` — cart, orders, order items
6. `payment-methods-schema.sql` — metode pembayaran
7. `storage-setup.sql` — bucket & policy storage
8. `landing-page-images-schema.sql` — gambar landing page
9. `about-us-schema.sql` — konten halaman About
10. `community-posts-schema.sql` — galeri community
11. `site-settings-schema.sql` — pengaturan situs (logo, dll.)

Setelah itu jalankan semua file di `migrations/` sesuai urutan tanggal commit-nya,
atau minimal yang relevan dengan fitur yang dipakai.

## Update database yang sudah jalan

Cek `migrations/` dan jalankan yang belum pernah dieksekusi. Beberapa halaman admin
akan menampilkan pesan error yang menyebutkan nama file spesifik kalau kolom atau
tabelnya belum ada — jalankan file yang disebut di pesan tersebut.

Yang berkaitan dengan keamanan dan sebaiknya selalu dijalankan:

- `migrations/secure-storage-policies.sql`
- `migrations/secure-order-write-policies.sql`
- `migrations/make-payment-proofs-bucket-private.sql`

Verifikasi hasilnya dengan `checks/test-security-policies.sql`.

## Catatan soal `fixes/`

Isinya script satu kali pakai untuk memperbaiki masalah yang pernah terjadi (RLS
salah, URL gambar rusak, registrasi gagal). Jangan dijalankan di database baru —
`schema/` dan `migrations/` sudah mencakup kondisi akhirnya.
