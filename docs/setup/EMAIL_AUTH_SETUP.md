# ✅ Email Authentication Setup - COMPLETE

## 🎯 Flow Registrasi dengan Email Confirmation

### Cara Kerja:
1. **User Daftar** → Input email, password, nama, dll
2. **Supabase Kirim Email** → Email konfirmasi otomatis terkirim
3. **User Klik Link** → Confirm email dari inbox
4. **User Login** → Setelah confirm baru bisa login

---

## 🔧 Yang Sudah Diperbaiki

### 1. **lib/auth.ts**
- ✅ Register selalu return `needsEmailConfirmation: true`
- ✅ Login detect error "Email not confirmed"
- ✅ Better error messages untuk user

### 2. **app/register/page.tsx**  
- ✅ Clear success message dengan emoji
- ✅ Instruksi jelas: "Cek email & klik link konfirmasi"
- ✅ Warning: Harus confirm email dulu sebelum login

### 3. **app/login/page.tsx**
- ✅ Error message dalam Bahasa Indonesia
- ✅ Emoji untuk visual feedback
- ✅ Specific error untuk email not confirmed
- ✅ Reminder untuk cek spam folder

---

## 📝 Langkah Setup Supabase (WAJIB!)

### **Step 1: Jalankan SQL Fix**
Buka **Supabase Dashboard** → **SQL Editor**

Copy-paste dan **RUN** file: `fix-user-registration.sql`

Ini akan:
- ✅ Fix trigger `handle_new_user()`
- ✅ Fix RLS policies untuk insert users
- ✅ Grant permissions untuk service_role

### **Step 2: Configure Email Settings**
Pergi ke: **Authentication** → **Email Templates**

#### **Confirm Signup Template**:
```
Subject: Konfirmasi Email Anda - Bearion

<h2>Selamat Datang di Bearion!</h2>

<p>Terima kasih sudah mendaftar. Silakan klik tombol di bawah untuk mengkonfirmasi email Anda:</p>

<p><a href="{{ .ConfirmationURL }}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Konfirmasi Email</a></p>

<p>Atau copy-paste link ini ke browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>Link ini akan expired dalam 24 jam.</p>

<p>Jika Anda tidak mendaftar, abaikan email ini.</p>

<p>Salam,<br>Tim Bearion</p>
```

### **Step 3: Email Provider Settings**
Pergi ke: **Project Settings** → **Auth** → **Email**

**Option 1: Development (Supabase Default)**
- ✅ Enable "Enable email confirmations"
- ✅ Gunakan Supabase email provider (sudah default)
- ⚠️ Email mungkin masuk spam, kasih tau user untuk cek spam folder

**Option 2: Production (Custom SMTP)**

Project ini memakai Brevo. Langkah lengkap, termasuk prasyarat aktivasi akun dan
nilai yang harus diisi, ada di **[BREVO_SMTP_SUPABASE.md](./BREVO_SMTP_SUPABASE.md)**.

Ringkasnya:
- SMTP Host: `smtp-relay.brevo.com`
- SMTP Port: `587`
- Username: dari Brevo → SMTP & API → SMTP (format `xxxxxx001@smtp-brevo.com`,
  **bukan** email akun Brevo)
- Password: SMTP key Brevo (`xsmtpsib-...`)
- Sender Email: harus sender yang sudah terverifikasi di Brevo

⚠️ Tanpa langkah ini, email konfirmasi signup dikirim lewat SMTP bawaan Supabase
dan **tidak akan muncul di log Brevo sama sekali**.

### **Step 4: URL Configuration**
Pergi ke: **Authentication** → **URL Configuration**

```
Site URL: https://yourdomain.com
Redirect URLs:
- http://localhost:3000/login
- https://yourdomain.com/login
```

---

## 🧪 Testing Flow

### **Test 1: Register New User**
```bash
1. Buka http://localhost:3000/register
2. Isi form dengan email VALID (Gmail/Yahoo/dll)
3. Klik "Daftar"
4. Lihat alert: "✅ Pendaftaran berhasil! 📧 Silakan cek email..."
5. Redirect ke /login
```

### **Test 2: Check Email**
```bash
1. Buka inbox email yang didaftarkan
2. Cari email dari "noreply@mail.app.supabase.io"
3. Jika tidak ada, CEK SPAM/JUNK FOLDER!
4. Klik link "Confirm your mail"
5. Akan redirect ke /login dengan session aktif
```

### **Test 3: Login Before Confirmation**
```bash
1. Coba login SEBELUM confirm email
2. Error: "📧 Email belum dikonfirmasi! Silakan cek inbox..."
3. ❌ Login GAGAL sampai email dikonfirmasi
```

### **Test 4: Login After Confirmation**
```bash
1. Confirm email dulu (klik link di email)
2. Baru coba login
3. ✅ Login BERHASIL
4. Redirect ke /catalog (user) atau /admin/dashboard (admin)
```

---

## 🐛 Troubleshooting

### Problem 1: Email Tidak Masuk
**Solusi:**
- ✅ Cek SPAM/JUNK folder
- ✅ Tunggu 1-2 menit (email delayed)
- ✅ Cek Supabase Dashboard → Logs → Auth Logs
- ✅ Pastikan email confirmation enabled

### Problem 2: Login Error "Invalid credentials"
**Cause:** Email belum dikonfirmasi
**Solusi:**
- ✅ Cek inbox email
- ✅ Klik link konfirmasi
- ✅ Coba login lagi

### Problem 3: User Tidak Masuk ke Database
**Solusi:**
- ✅ Jalankan `fix-user-registration.sql`
- ✅ Check trigger: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created'`
- ✅ Check RLS policies: **Table Editor** → users → **RLS Policies**

### Problem 4: Confirmation Link Error
**Cause:** URL Configuration salah
**Solusi:**
- ✅ Pergi ke **Authentication** → **URL Configuration**
- ✅ Tambahkan redirect URL yang sesuai
- ✅ Save & coba register ulang

---

## 📊 Monitoring

### Check Auth Logs
```sql
-- Supabase Dashboard → SQL Editor
SELECT 
  created_at,
  event_type,
  user_id,
  email
FROM auth.audit_log_entries
ORDER BY created_at DESC
LIMIT 20;
```

### Check Users Created
```sql
-- Lihat user yang sudah register
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC;
```

### Check Public Users Table
```sql
-- Lihat user di public schema
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM users
ORDER BY created_at DESC;
```

---

## ✅ Checklist Sebelum Launch

- [ ] Jalankan `fix-user-registration.sql` di Supabase
- [ ] Enable email confirmation di Supabase Auth settings
- [ ] Setup email template dalam Bahasa Indonesia
- [ ] Configure Site URL & Redirect URLs
- [ ] Test full registration flow (register → email → confirm → login)
- [ ] Test error handling (login before confirm)
- [ ] Setup custom SMTP untuk production (optional tapi recommended)
- [ ] Monitor email delivery logs
- [ ] Add email resend functionality (future enhancement)

---

## 🚀 Production Recommendations

### 1. Custom Email Provider
Gunakan SendGrid/AWS SES/Mailgun untuk:
- ✅ Better deliverability
- ✅ Tidak masuk spam
- ✅ Custom branding
- ✅ Email analytics

### 2. Email Template Improvements
- ✅ Add company logo
- ✅ Better styling dengan CSS
- ✅ Add social media links
- ✅ Add support contact

### 3. User Experience
- ✅ Add "Resend Confirmation Email" button
- ✅ Show countdown timer for link expiry
- ✅ Better error messages dengan solution
- ✅ Add FAQ section

---

## 📞 Support

Jika masih error setelah ikuti semua step:
1. Check Supabase Auth Logs
2. Check browser console errors
3. Verify SQL trigger dan RLS policies
4. Test dengan email provider berbeda (Gmail vs Yahoo)

**Last Updated:** ${new Date().toLocaleDateString('id-ID')}
