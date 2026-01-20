# 📧 Setup Email Autentikasi - Panduan Lengkap

## 🎯 Pilihan Solusi

### Opsi 1: Disable Email Confirmation (CEPAT - Development)
**Untuk testing lokal, skip konfirmasi email**

### Opsi 2: Setup Email Confirmation (Production Ready)
**Email otomatis terkirim dengan link konfirmasi**

---

## ⚡ Opsi 1: Disable Email Confirmation (Rekomendasi untuk Development)

### Langkah-langkah:

1. **Buka Supabase Dashboard**
2. **Authentication** → **Settings** (di sidebar)
3. Scroll ke **Email**
4. Cari **Enable email confirmations**
5. **Toggle OFF** (disable)
6. Klik **Save**

**Hasilnya:**
- ✅ User langsung bisa login tanpa konfirmasi email
- ✅ Tidak perlu setup SMTP
- ✅ Cocok untuk development/testing
- ⚠️ **JANGAN** disable di production!

### Test Sekarang:
1. Daftar dengan email baru
2. Langsung bisa login (tanpa cek email)
3. Redirect otomatis ke catalog

---

## 📨 Opsi 2: Setup Email Confirmation (Production)

### A. Verifikasi Email Settings di Supabase

1. **Dashboard** → **Authentication** → **Settings**
2. **Email** section:
   - ✅ Enable email confirmations: **ON**
   - ✅ Enable email change confirmations: **ON**
   - ✅ Secure email change: **ON**

### B. Setup Email Template

1. **Dashboard** → **Authentication** → **Email Templates**
2. Pilih **Confirm signup** template
3. Ganti content dengan ini:

```html
<h2>Selamat datang di Bearions! 🐻</h2>

<p>Terima kasih sudah mendaftar. Klik tombol di bawah untuk mengaktifkan akun Anda:</p>

<p style="margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}" 
     style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
    Aktifkan Akun Saya
  </a>
</p>

<p>Atau copy link ini ke browser:</p>
<p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>

<p>Link ini akan kadaluarsa dalam 24 jam.</p>

<p>Setelah aktif, Anda bisa login di: <strong>{{ .SiteURL }}/login</strong></p>

<hr>
<p style="color: #666; font-size: 12px;">
  Jika Anda tidak mendaftar di Bearions, abaikan email ini.
</p>
```

4. **Subject Line:** `Konfirmasi Email Anda - Bearions`
5. Klik **Save**

### C. Konfigurasi Redirect URL

1. **Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL:** `http://localhost:3000` (development) atau domain production
3. **Redirect URLs:** Tambahkan:
   ```
   http://localhost:3000/login
   http://localhost:3000/catalog
   http://localhost:3000/**
   ```
4. **Save**

### D. Setup SMTP (Opsional - untuk Custom Email)

**Default:** Supabase kirim email dari `noreply@mail.app.supabase.io`

**Custom Domain (Production):**
1. **Dashboard** → **Project Settings** → **Auth**
2. **SMTP Settings**
3. Isi dengan provider Anda:
   - **Gmail:**
     - Host: `smtp.gmail.com`
     - Port: `587`
     - User: `your-email@gmail.com`
     - Password: App Password (buat di Google Account)
   
   - **SendGrid:**
     - Host: `smtp.sendgrid.net`
     - Port: `587`
     - User: `apikey`
     - Password: Your SendGrid API Key

4. **Enable Custom SMTP:** Toggle ON
5. **Save**

---

## 🧪 Testing Email Confirmation

### Test di Development:

1. **Buka Supabase Dashboard**
2. **Authentication** → **Users**
3. Daftar user baru dari website
4. **Cek Email Inbox** (dan folder spam!)
5. Klik link konfirmasi
6. Seharusnya redirect ke login page
7. Login dengan akun yang sudah dikonfirmasi

### Cek Status Email:

**Di Supabase:**
- Dashboard → **Logs** → **Auth Logs**
- Lihat event: `user_signup`, `user_confirmation`

**Di Browser Console:**
```javascript
// Cek user confirmation status
const { data: { user } } = await supabase.auth.getUser()
console.log('Email confirmed:', user?.email_confirmed_at)
```

---

## ⚠️ Troubleshooting

### 1. Email Tidak Terkirim

**Cek:**
- Dashboard → Logs → Cari error email
- SMTP settings benar
- Email tidak masuk spam

**Solusi Cepat:**
```sql
-- Manual konfirmasi user di Supabase SQL Editor
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'user@example.com';
```

### 2. Link Konfirmasi Expired

Default: 24 jam. Untuk extend:
1. Dashboard → Authentication → Settings
2. **JWT Expiry:** 604800 (7 hari dalam detik)
3. Save

### 3. Redirect Setelah Konfirmasi Tidak Bekerja

**Update kode di [lib/auth.ts](lib/auth.ts):**

```typescript
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: data.email,
  password: data.password,
  options: {
    emailRedirectTo: `${window.location.origin}/login?confirmed=true`, // Tambah parameter
    data: {
      full_name: data.full_name,
      phone: data.phone,
      address: data.address,
    }
  }
})
```

**Update login page untuk auto-login setelah confirm:**

```typescript
// Di app/login/page.tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('confirmed') === 'true') {
    // Show success message
    alert('✅ Email berhasil dikonfirmasi! Silakan login.')
  }
}, [])
```

### 4. Test Email di Development Tanpa Email Asli

**Gunakan Mailtrap atau Mailhog:**

1. Daftar di [Mailtrap.io](https://mailtrap.io) (free)
2. Dapat SMTP credentials
3. Setup di Supabase SMTP settings
4. Email akan tertangkap di Mailtrap inbox
5. Test tanpa kirim ke email asli

---

## 🚀 Rekomendasi Setup

### Development (Lokal):
```
✅ Disable email confirmation
✅ User langsung bisa login
✅ Cepat untuk testing
```

### Staging/Testing:
```
✅ Enable email confirmation
✅ Gunakan Mailtrap/Mailhog
✅ Test flow lengkap tanpa spam email asli
```

### Production:
```
✅ Enable email confirmation
✅ Custom SMTP (SendGrid/AWS SES)
✅ Custom email template dengan branding
✅ Monitor email delivery di logs
```

---

## 📝 Script Helper

### Manual Approve Semua User (Development Only):

```sql
-- Jalankan di Supabase SQL Editor
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;
```

### Check Email Status:

```sql
-- Lihat user yang belum confirm
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;
```

### Reset Confirmation (untuk re-test):

```sql
-- Reset confirmation status untuk testing
UPDATE auth.users 
SET email_confirmed_at = NULL 
WHERE email = 'test@example.com';
```

---

## ✅ Checklist Final

Setelah setup, pastikan:

- [ ] Email confirmation setting sudah sesuai (ON/OFF)
- [ ] Email template sudah di-customize
- [ ] Redirect URLs sudah ditambahkan
- [ ] Test registrasi → email terkirim → klik link → redirect → login
- [ ] Cek spam folder jika email tidak masuk inbox
- [ ] Logs tidak ada error email delivery

---

## 🎯 Quick Start (Pilih Salah Satu)

### Untuk Development (5 detik):
1. Supabase → Authentication → Settings
2. Disable "Enable email confirmations"
3. Save
4. **SELESAI!** User langsung bisa login tanpa email

### Untuk Production (5 menit):
1. Enable email confirmations
2. Custom email template
3. Setup SMTP (atau pakai Supabase default)
4. Test dengan email asli
5. Monitor logs

---

**Pilihan Anda?**
- Untuk test cepat: Gunakan **Opsi 1** (disable confirmation)
- Untuk production: Gunakan **Opsi 2** (setup email lengkap)
