# Brevo SMTP untuk Email Verifikasi Supabase

Dokumen ini menjelaskan cara mengarahkan email autentikasi Supabase (konfirmasi
signup, reset password, magic link) melalui Brevo.

## Kenapa ini perlu

Ada dua jalur email yang berbeda di project ini, dan mudah tertukar:

| Jalur | Dikirim oleh | Dipakai untuk |
|---|---|---|
| Brevo **API** (`lib/brevo.ts`) | Kode aplikasi kita | `/api/auth/forgot-password`, `/api/contact`, `/api/notifications/send-email` |
| SMTP **Supabase** | Server Supabase, bukan kode kita | **Konfirmasi signup**, magic link, change email |

Email konfirmasi signup **tidak pernah melewati `lib/brevo.ts`**. Supabase yang
mengirimnya. Karena itu, selama SMTP kustom belum diatur di dashboard Supabase,
email verifikasi tidak akan pernah muncul di log Brevo — berapa kali pun dicoba.

Template HTML di [`supabase/email-templates/`](../../supabase/email-templates/)
ditujukan untuk ditempel di dashboard Supabase, bukan dirender oleh aplikasi.

## Prasyarat: aktivasi akun Brevo

> **Akun Brevo harus diaktifkan untuk pengiriman transactional sebelum langkah
> di bawah bisa berfungsi.** Selama belum aktif, SMTP key yang valid pun akan
> ditolak saat mengirim:
>
> ```
> SMTP : 502 5.7.0 Your SMTP account is not yet activated.
> API  : 403 permission_denied — Your SMTP account is not yet activated.
> ```

Cara mengaktifkan:

1. Lengkapi profil akun di Brevo → **Settings → My company** (alamat, kota, kode
   pos, negara). Profil yang kosong adalah penyebab paling umum aktivasi
   tertahan.
2. Pastikan sender terverifikasi di **Settings → Senders, Domains & Dedicated IPs**.
3. Kalau setelah profil lengkap masih tertahan, hubungi `contact@brevo.com`
   dan minta aktivasi transactional sending. Sebutkan jenis usaha dan contoh
   email yang akan dikirim (email verifikasi akun toko online).
4. Verifikasi status aktif dengan:
   ```bash
   curl -s https://api.brevo.com/v3/account -H "api-key: $BREVO_API_KEY" | grep -o '"enabled":[a-z]*'
   ```
   Harus mengembalikan `"enabled":true`. Selama `false`, relay masih terkunci.

## Konfigurasi SMTP di Supabase

Setelah akun Brevo aktif, buka **Supabase Dashboard → Project Settings →
Authentication → SMTP Settings**, aktifkan *Enable Custom SMTP*, lalu isi:

| Field | Nilai |
|---|---|
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | lihat Brevo → **SMTP & API → SMTP**, format `xxxxxx001@smtp-brevo.com` |
| Password | SMTP key Brevo (diawali `xsmtpsib-`) |
| Sender email | harus sama persis dengan sender terverifikasi di Brevo |
| Sender name | `Bearion` |

Catatan penting:

- Username SMTP **bukan** email akun Brevo. Memakai email akun akan menghasilkan
  `535 5.7.8 Authentication failed`. Ambil username dari dashboard Brevo.
- SMTP key berbeda dari API key. API key (`xkeysib-`) dipakai `lib/brevo.ts`;
  SMTP key (`xsmtpsib-`) hanya dipakai Supabase.
- Kredensial ini disimpan di dashboard Supabase, **bukan** di `.env.local`.
  Aplikasi tidak pernah membacanya.

## URL Configuration

Di **Authentication → URL Configuration**, pastikan domain produksi terdaftar.
Link verifikasi dibangun dari origin browser (lihat `buildLoginRedirectUrl` di
[`lib/auth.ts`](../../lib/auth.ts)), dan Supabase menolak redirect ke URL yang
tidak ada di allowlist.

```
Site URL      : https://<domain-produksi>
Redirect URLs : https://<domain-produksi>/auth/confirm
                https://<domain-produksi>/auth/reset-password
                http://localhost:3000/auth/confirm
                http://localhost:3000/auth/reset-password
```

## Verifikasi setelah setup

1. Cek relay aktif (perintah `curl` di atas mengembalikan `"enabled":true`).
2. Daftar akun baru dengan alamat email asli.
3. Email konfirmasi harus muncul di **Brevo → Transactional → Logs**. Kalau tidak
   muncul di sini, Supabase belum memakai SMTP Brevo — cek ulang SMTP Settings.
4. Klik link di email; harus mendarat di `/auth/confirm` lalu redirect ke
   `/login?confirmed=true`.
5. Login harus berhasil. Sebelum diklik, login harus ditolak dengan
   `Email not confirmed`.

## Batas kuota

Paket free Brevo saat ini: **300 email/hari**, dihitung gabungan untuk email
verifikasi, reset password, kontak, dan notifikasi pesanan. Pantau kuota
menjelang peluncuran.
