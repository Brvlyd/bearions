# 🎯 Payment Proof Verification Setup Checklist

## ✅ Completed

- [x] Admin dashboard page created at `/admin/dashboard/payment-proofs`
- [x] Payment proof verification UI with image/PDF preview
- [x] Filter tabs (All, Unverified, Pending, Verified, Rejected)
- [x] Admin approval/rejection with reason
- [x] Email notification templates created
- [x] Notification service integrated
- [x] Payment page updated to show verification status
- [x] Sidebar menu item added
- [x] Database migration SQL provided
- [x] API endpoint for email sending
- [x] Build successful - no errors

## 📋 Next Steps (Required)

### Step 1: Database Migration (CRITICAL)
```
Location: Supabase Console → SQL Editor
File: add-payment-proof-verification.sql

Do this first! This adds the verification columns to the payments table.
```

**How:**
1. Open [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Select your project
3. Go to **SQL Editor**
4. Click **New query**
5. Copy & paste entire `add-payment-proof-verification.sql` file
6. Click **Run**
7. Verify "SUCCESS" message

⏱️ Takes ~30 seconds

---

### Step 2: Email Service Setup (Optional but Recommended)
```
Currently: Emails log to console only
To enable real emails, update: /app/api/notifications/send-email.ts
```

**Choose one service:**
- ✅ SendGrid (easiest, free tier available)
- ✅ Resend (modern, simple API)
- ✅ Supabase Email (if using Supabase Auth)
- ✅ AWS SES (enterprise)

**For SendGrid:**
```bash
npm install @sendgrid/mail
```

Create `.env.local`:
```
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=noreply@bearions.com
```

Update `send-email.ts` to actually call SendGrid

---

### Step 3: Test the Feature

**As Customer:**
1. Go to `/payment/[orderNumber]` (after placing order)
2. Upload payment proof (JPG, PNG, WebP, or PDF)
3. See status: "⏳ Pending Verification"

**As Admin:**
1. Login to `/admin/dashboard`
2. Click **Payment Proofs** in sidebar
3. Click **View Proof**
4. Click **Verify** or **Reject**
5. Check customer notification

---

## 📁 Files Created/Modified

**New Files:**
- ✅ `/app/admin/dashboard/payment-proofs/page.tsx` - Admin UI
- ✅ `/app/api/notifications/send-email.ts` - Email API
- ✅ `/lib/notifications.ts` - Notification service
- ✅ `add-payment-proof-verification.sql` - Database migration
- ✅ `PAYMENT_PROOF_VERIFICATION_SETUP.md` - Full documentation

**Modified Files:**
- ✅ `/app/payment/[orderNumber]/page.tsx` - Show verification status
- ✅ `/app/admin/dashboard/layout.tsx` - Added sidebar menu
- ✅ `/lib/supabase.ts` - Payment type updated

---

## 🚀 Quick Start Commands

```bash
# Build & test
npm run build

# Start server
npm run start

# Access points
Admin Panel:        http://localhost:3000/admin/dashboard
Payment Proofs:     http://localhost:3000/admin/dashboard/payment-proofs
Customer Payment:   http://localhost:3000/payment/ORDER_NUMBER
```

---

## 🔍 Testing Checklist

- [ ] Database migration runs without errors
- [ ] Admin can access `/admin/dashboard/payment-proofs`
- [ ] Payment proof filter tabs work
- [ ] Can view proof images/PDFs in modal
- [ ] Can verify proof (status changes to verified)
- [ ] Can reject proof with reason
- [ ] Customer sees status badge on payment page
- [ ] Email logs appear in console (Step 2 for real emails)

---

## 📝 Status Display

Customer will see one of:
- 🟢 **Verified** - "Verified on [date]"
- 🟡 **Pending Verification** - "Waiting for admin review"
- 🔴 **Rejected** - "Please submit a new payment proof"

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Column not found" in Supabase | Run migration SQL in SQL Editor |
| Can't see Payment Proofs menu | Clear browser cache, re-login as admin |
| Emails not sending | Check `/app/api/notifications/send-email.ts` logs or setup email service |
| Payment proof not showing | Customer must upload at `/payment/[orderNumber]` first |

---

## 📞 Support Files

- 📖 [Full Setup Guide](./PAYMENT_PROOF_VERIFICATION_SETUP.md)
- 📊 [Database Migration](./add-payment-proof-verification.sql)
- 💻 [Admin Component](./app/admin/dashboard/payment-proofs/page.tsx)
- 📧 [Notification Service](./lib/notifications.ts)

---

## ✨ Features Ready

After migration and email setup:

✅ Customers can upload payment proofs  
✅ Admins can review and verify proofs  
✅ Customers notified when verified/rejected  
✅ Order processing can wait for verification  
✅ Track which admin verified and when  
✅ Support for multiple file types (JPG, PNG, WebP, PDF)  
✅ Bilingual UI (English & Indonesian)  
✅ Mobile-responsive design  

---

**Start with Step 1! The database migration is required.**
