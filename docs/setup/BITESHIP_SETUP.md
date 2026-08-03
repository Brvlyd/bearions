# Biteship — Ongkir & Lacak Paket Otomatis

Biteship menghitung ongkir dan melacak paket dari belasan perusahaan kurir
sekaligus, jadi toko tidak perlu memelihara daftar tarif manual.

Halaman pengaturannya ada di **Admin → Pengiriman**.

---

## Ringkasan untuk pemilik toko

Ada dua cara menghitung ongkir, dipilih di Admin → Pengiriman:

| | Tabel Tarif Sendiri | Tarif Kurir Otomatis (Biteship) |
|---|---|---|
| Sumber harga | Daftar yang Anda isi sendiri | Langsung dari kurir, selalu terbaru |
| Biaya | Gratis | Butuh saldo Biteship |
| Perawatan | Harus diperbarui manual | Tidak perlu |
| Kalau bermasalah | — | Otomatis kembali ke Tabel Tarif Sendiri |

**Tabel Tarif Sendiri selalu jadi cadangan.** Walaupun Anda memilih Tarif Kurir
Otomatis, kalau Biteship sedang error atau saldonya habis, sistem otomatis
memakai tabel itu supaya pembeli tetap bisa checkout. Karena itu angkanya
sebaiknya tetap diperbarui sesekali walaupun sudah pakai Biteship.

### Kotak "Status Koneksi Kurir Otomatis"

Di bagian atas halaman ada kotak status dengan tombol **Cek Ulang**:

- 🟢 **Biteship aktif** — ongkir dan lacak paket otomatis berjalan normal.
- 🟡 **Saldo Biteship habis** — kunci API benar tapi saldo Rp 0. Isi saldo di
  dashboard Biteship (menu Balance / Top Up), lalu klik Cek Ulang.
- 🔴 **Kunci API ditolak** / **tidak bisa dihubungi** — hubungi developer.

---

## Saldo

Endpoint cek ongkir (`/v1/rates`) dan lacak paket (`/v1/trackings`) **ditagih
per panggilan**. Akun dengan saldo Rp 0 menolak keduanya dengan HTTP 400
`"No sufficient balance"`, dan toko diam-diam memakai tabel zona.

Pencarian alamat (`/v1/maps/areas`) dan daftar kurir (`/v1/couriers`) gratis,
jadi keduanya tetap jalan walau saldo kosong.

Kotak status di admin membedakan ketiga kondisi itu, karena dari sisi pembeli
semuanya terlihat sama: harga tetap keluar, hanya sumbernya yang berbeda.

---

## Variabel environment

```bash
# Kunci API: dashboard Biteship -> Settings -> API Keys
BITESHIP_API_KEY=biteship_live....

# Kunci rahasia untuk POST /api/shipping/sync-tracking (penyegaran terjadwal)
SHIPPING_SYNC_SECRET=...

# Kunci rahasia yang dikirim Biteship ke POST /api/webhooks/biteship
BITESHIP_WEBHOOK_SECRET=...
```

Tanpa `BITESHIP_API_KEY`, toko tetap jalan penuh memakai tabel zona.

---

## Alamat gudang & "kode kecamatan"

Ongkir yang dihitung dari **kode pos** saja hanya akurat sampai tingkat kota.
Biteship punya *area ID* yang akurat sampai kecamatan — selisih keduanya persis
jenis kesalahan yang membuat toko menombok ongkir.

Di Admin → Pengiriman, kotak **"Cara cepat: cari kecamatan gudang Anda"**
memanggil `GET /api/shipping/areas`. Memilih satu hasil akan mengisi kode
kecamatan, kota, provinsi, dan kode pos sekaligus, jadi keempatnya tidak bisa
saling bertentangan.

Endpoint yang sama dipakai untuk alamat pengiriman pembeli.

---

## Kurir yang tersedia

Daftar kurir yang diminta ada di `lib/biteship.ts` (`DOMESTIC_COURIERS` dan
`INTERNATIONAL_COURIERS`). Daftar itu harus mencerminkan kurir yang benar-benar
dimiliki akun — meminta kurir yang tidak dimiliki hanya membuang slot di jawaban.

Cek isi akun kapan saja:

```bash
curl -H "authorization: $BITESHIP_API_KEY" https://api.biteship.com/v1/couriers
```

Catatan: akun ini **tidak punya DHL**. Untuk kiriman luar negeri, kurir yang
tersedia adalah `tlx` (international standard) dan `pos`.

---

## Lacak paket otomatis

Timeline pesanan diisi dua sumber, keduanya lewat `order_tracking_events` dengan
`dedupe_key` sehingga aman dipanggil berulang:

1. **Webhook** — `POST /api/webhooks/biteship` dipanggil Biteship begitu paket
   dipindai. Daftarkan URL-nya di dashboard Biteship (Settings → Webhook)
   beserta `BITESHIP_WEBHOOK_SECRET`. Isi payload hanya dipakai untuk menentukan
   pesanan mana yang berubah; scan-nya dibaca ulang dari API, jadi payload palsu
   paling banter memicu satu lookup tambahan, tidak pernah menulis event palsu.

2. **Cron** — `POST /api/shipping/sync-tracking` menyapu semua paket yang masih
   jalan. Arahkan Supabase Cron atau Vercel Cron ke sini **sekali atau dua kali
   sehari**; lebih sering hanya menghabiskan saldo tanpa informasi baru, karena
   kurir sendiri hanya memindai beberapa kali per paket.

   ```bash
   curl -X POST https://<domain>/api/shipping/sync-tracking \
     -H "x-sync-secret: $SHIPPING_SYNC_SECRET"
   ```

Membuka halaman pesanan juga memicu penyegaran kalau data terakhir sudah lebih
dari 15 menit. Begitu kurir melaporkan "delivered", status pesanan ikut berubah
otomatis tanpa perlu diubah manual di admin.

---

## Endpoint di aplikasi ini

| Route | Akses | Fungsi |
|---|---|---|
| `POST /api/shipping/rates` | pembeli login | Pilihan kurir + ongkir untuk keranjang |
| `GET /api/shipping/areas` | pembeli login | Cari kecamatan → area ID |
| `GET /api/admin/shipping/status` | admin | Status koneksi & saldo Biteship |
| `POST /api/shipping/sync-tracking` | secret | Sapuan terjadwal semua paket berjalan |
| `POST /api/webhooks/biteship` | secret | Push scan dari Biteship |
| `GET /api/orders/[orderNumber]/tracking` | pemilik pesanan / admin | Timeline satu pesanan |

Harga tidak pernah dipercaya dari browser: `/api/orders/create` menjalankan ulang
mesin tarif yang sama, jadi quote basi atau yang diubah-ubah tidak bisa
memengaruhi jumlah yang benar-benar ditagih.
