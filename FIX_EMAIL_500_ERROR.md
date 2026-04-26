# 🚨 Fix Error 500 - Email Confirmation untuk Production

## ❌ Error yang Muncul:
```
Error 500: Error sending confirmation email
AuthApiError: Error sending confirmation email
```

## ✅ Solusi untuk Production/Komersial

---

## Step 1: Verifikasi Email Settings di Supabase

### A. Cek Email Confirmation Settings

1. **Buka Supabase Dashboard**
2. **Authentication** → **Settings**
3. **Email Auth** section:
   - ✅ **Enable email confirmations:** ON
   - ✅ **Secure email change:** ON
   - ⏱️ **Confirm email expiry:** 86400 (24 jam)

### B. Cek SMTP Provider Settings

**Default Supabase (Free Tier):**
- ✅ Supabase menyediakan email gratis sampai 30k email/bulan
- ❌ JANGAN enable custom SMTP dulu (biarkan OFF)
- ✅ Email dikirim dari: `noreply@mail.app.supabase.io`

**Settings:**
1. **Project Settings** → **Auth** → **SMTP Settings**
2. Pastikan **Enable Custom SMTP:** **OFF** (untuk sekarang)
3. Gunakan Supabase default dulu

---

## Step 2: Setup Email Template dengan Benar

### A. Custom Confirm Signup Template

1. **Dashboard** → **Authentication** → **Email Templates**
2. Pilih **"Confirm signup"** template
3. Copy template ini:

**Subject:**
```
Konfirmasi Email Anda - Bearions
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 20px 0;">
    <div style="width: 60px; height: 60px; background-color: #000; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; border-radius: 8px;">
      B
    </div>
  </div>

  <h2 style="color: #000; text-align: center;">Selamat Datang di Bearions! 🐻</h2>

  <p>Terima kasih sudah mendaftar di Bearions. Untuk melanjutkan, silakan konfirmasi alamat email Anda dengan mengklik tombol di bawah ini:</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .ConfirmationURL }}" 
       style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
      Konfirmasi Email Saya
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">Atau copy dan paste link berikut ke browser Anda:</p>
  <p style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px;">
    <a href="{{ .ConfirmationURL }}" style="color: #000;">{{ .ConfirmationURL }}</a>
  </p>

  <p style="color: #666; font-size: 14px; margin-top: 30px;">
    ⏱️ Link ini akan kadaluarsa dalam <strong>24 jam</strong>.
  </p>

  <p style="color: #666; font-size: 14px;">
    Setelah email Anda terkonfirmasi, Anda dapat login dan mulai berbelanja di Bearions!
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="color: #999; font-size: 12px; text-align: center;">
    Jika Anda tidak mendaftar di Bearions, abaikan email ini.<br>
    Email ini dikirim otomatis, mohon tidak membalas.
  </p>

  <p style="color: #999; font-size: 12px; text-align: center;">
    © 2026 Bearions. All rights reserved.
  </p>

</body>
</html>
```

4. **Save Changes**

---

## Step 3: Konfigurasi URL Redirect

### A. Set Site URL

1. **Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL:** 
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

### B. Add Redirect URLs

Tambahkan semua URL yang diizinkan:

**Development:**
```
http://localhost:3000/**
http://localhost:3000/login
http://localhost:3000/catalog
```

**Production (nanti):**
```
https://yourdomain.com/**
https://yourdomain.com/login
https://yourdomain.com/catalog
```

3. **Save**

---

## Step 4: Test Email Configuration

### A. Test Kirim Email

1. **Dashboard** → **Authentication** → **Settings**
2. Scroll ke bawah ke **Email Rate Limits**
3. Cek: `30000 emails per hour` (default Supabase)

### B. Manual Test dari Dashboard

1. **Dashboard** → **Authentication** → **Users**
2. Klik **Invite User** (untuk test)
3. Masukkan email test
4. Cek apakah email terkirim

---

## Step 5: Troubleshooting Error 500

### Penyebab Umum:

**1. Rate Limit Tercapai**
```sql
-- Cek berapa email yang sudah terkirim hari ini
SELECT COUNT(*) 
FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '1 day'
  AND payload->>'action' = 'user_signedup';
```

**2. Email Template Error**
- Pastikan tidak ada syntax error di template HTML
- Test dengan template default dulu

**3. SMTP Configuration Error**
- Disable custom SMTP (gunakan Supabase default)
- Jika pakai custom SMTP, verify credentials

**4. Domain/Email Blocked**
- Cek Supabase logs: **Dashboard** → **Logs** → **Auth Logs**
- Look for detailed error message

---

## Step 6: Alternative - Setup Custom SMTP (Production)

Untuk production, gunakan email service profesional:

### Option A: Gmail SMTP (Free - Terbatas)

1. **Project Settings** → **Auth** → **SMTP Settings**
2. **Enable Custom SMTP:** ON
3. Settings:
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP User: your-business-email@gmail.com
   SMTP Password: [App Password - buat di Google Account]
   Sender Email: your-business-email@gmail.com
   Sender Name: Bearions
   ```

4. **Cara buat App Password:**
   - Google Account → Security
   - 2-Step Verification (must be ON)
   - App passwords → Generate
   - Copy 16-digit password

### Option B: SendGrid (Rekomendasi untuk Production)

**Kenapa SendGrid:**
- ✅ Free tier: 100 email/hari
- ✅ Paid: Mulai $15/bulan untuk 50k email
- ✅ Delivery rate tinggi
- ✅ Analytics & tracking
- ✅ Professional untuk bisnis

**Setup:**

1. Daftar di [SendGrid.com](https://sendgrid.com)
2. Verify sender email/domain
3. Create API Key
4. Di Supabase:
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey
   SMTP Password: [Your SendGrid API Key]
   Sender Email: noreply@yourdomain.com
   Sender Name: Bearions
   ```

### Option C: AWS SES (Termurah untuk Volume Tinggi)

**Pricing:** $0.10 per 1000 email
**Setup:** Lebih kompleks, butuh verify domain

---

## Step 7: Test Email Flow Lengkap

### Test Checklist:

1. **Register user baru**
   ```
   - Email unik yang belum pernah dipakai
   - Gunakan email asli Anda untuk test
   ```

2. **Cek logs di Supabase**
   ```
   Dashboard → Logs → Auth Logs
   Look for: "user_signedup" event
   Should show: email sent successfully
   ```

3. **Cek inbox email**
   ```
   - Check inbox
   - Check spam/junk folder
   - Email dari: noreply@mail.app.supabase.io
   ```

4. **Klik link konfirmasi**
   ```
   - Should redirect ke login page
   - Message: "Email berhasil dikonfirmasi"
   - Email field auto-filled
   ```

5. **Login dengan akun yang sudah confirmed**
   ```
   - Should work successfully
   - Redirect ke catalog
   ```

---

## 🚨 Jika Masih Error 500

### Quick Fix - Manual Approve (Temporary):

Sementara development, approve user manual:

```sql
-- Approve semua user yang pending
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
```

### Debug Steps:

1. **Cek Supabase Service Status**
   - [status.supabase.com](https://status.supabase.com)
   - Pastikan email service online

2. **Cek Project Logs**
   ```
   Dashboard → Logs → Edge Functions
   Look for error details
   ```

3. **Try Reset Email Template**
   - Kembali ke default template
   - Save & test lagi

4. **Contact Supabase Support**
   - Dashboard → Support
   - Report email delivery issue
   - Include project ref & error details

---

## 📊 Monitoring Email Delivery (Production)

### Setup Monitoring:

```sql
-- Query untuk monitor email confirmation
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_signups,
  COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as confirmed,
  COUNT(*) FILTER (WHERE email_confirmed_at IS NULL) as pending
FROM auth.users
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Success Metrics:

- ✅ Email delivery rate: >95%
- ✅ Confirmation rate: >60% (dalam 24 jam)
- ✅ Error rate: <1%

---

## ✅ Final Checklist untuk Production

Sebelum launch:

- [ ] Email confirmation enabled
- [ ] Custom email template dengan branding
- [ ] SMTP setup (SendGrid/AWS SES recommended)
- [ ] Verify sender domain (untuk deliverability)
- [ ] Test email delivery ke berbagai provider (Gmail, Yahoo, Outlook)
- [ ] Cek spam score email
- [ ] Setup monitoring & alerts
- [ ] Backup plan jika email service down

---

## 🎯 Recommended Setup untuk Bisnis:

```
Development:
- Supabase default SMTP
- Email confirmation enabled
- Monitor logs

Production:
- SendGrid SMTP (atau AWS SES)
- Custom domain (noreply@yourdomain.com)
- Email analytics enabled
- Monitoring dashboard
- Backup email service
```

---

## 💰 Cost Estimation (Email Service):

**Supabase Default:**
- Free: 30k email/bulan
- Cocok untuk: <1000 user signup/bulan

**SendGrid:**
- Free: 100 email/hari (3000/bulan)
- Essentials: $15/bulan (50k email)
- Pro: $90/bulan (1.5M email)

**AWS SES:**
- $0.10 per 1000 email
- Cocok untuk: Volume tinggi
- Cheapest untuk 100k+ email/bulan

---

**Sekarang coba setup step-by-step di atas dan test lagi!** 🚀
