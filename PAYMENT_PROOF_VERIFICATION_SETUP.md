# Payment Proof Verification System Setup

## Overview

This system allows admins to verify payment proofs submitted by customers before processing their orders. Customers receive email notifications when their proof is verified or rejected.

## Features

✅ **Admin Dashboard Page** - Review and verify customer payment proofs
✅ **Multiple Status Types** - unverified, pending, verified, rejected  
✅ **Image/PDF Preview** - View payment proofs in modal
✅ **Rejection Reasons** - Admin can specify why proof was rejected
✅ **Email Notifications** - Automatic emails sent to customers
✅ **Verification Tracking** - Track which admin verified and when

## Setup Steps

### 1. Run Database Migration

1. Open [Supabase Console](https://supabase.com/dashboard)
2. Go to **SQL Editor**
3. Create new query and paste contents of `add-payment-proof-verification.sql`
4. Click **Run**

**Migration adds:**
- `proof_verification_status` column to payments table
- `proof_verified_by` column (admin user ID)
- `proof_verified_at` column (timestamp)
- Indexes for performance
- RLS policy for admin access

### 2. Configure Email Service (Optional)

The system sends email notifications to customers. Currently it logs to console.

**To enable actual email sending:**

Edit `/app/api/notifications/send-email.ts`:

```typescript
// Option 1: Use Supabase Email
import { EmailClient } from '@supabase/supabase-js'

// Option 2: Use SendGrid
import sgMail from '@sendgrid/mail'

// Option 3: Use Resend
import { Resend } from 'resend'

// Option 4: Use AWS SES
import AWS from 'aws-sdk'
```

### 3. Test the Feature

1. **User Flow:**
   - Customer submits payment proof at `/payment/[orderNumber]`
   - Proof appears in admin dashboard

2. **Admin Flow:**
   - Go to `/admin/dashboard/payment-proofs`
   - Click "View Proof" to see image/PDF
   - Click "Verify" to approve (sends email to customer)
   - Click "Reject" to decline (sends rejection email with reason)

3. **Customer Notification:**
   - Verified: Customer receives confirmation email
   - Rejected: Customer receives email with reason and re-upload link

## File Structure

```
app/
├── admin/dashboard/
│   └── payment-proofs/
│       └── page.tsx          # Admin verification UI
├── payment/
│   └── [orderNumber]/
│       └── page.tsx          # Customer proof submission (updated)
└── api/
    └── notifications/
        └── send-email.ts     # Email sending API

lib/
├── notifications.ts          # Notification service
└── supabase.ts              # Types (Payment type updated)

add-payment-proof-verification.sql  # Database migration
```

## Database Schema

```sql
ALTER TABLE payments ADD (
  proof_verification_status VARCHAR(20) DEFAULT 'unverified',
  -- unverified | pending | verified | rejected
  
  proof_verified_by UUID,
  -- FK to auth.users (admin who verified)
  
  proof_verified_at TIMESTAMP
  -- When verification happened
)
```

## API Endpoints

### POST /api/notifications/send-email
Sends email notifications to customers

**Request:**
```json
{
  "to": "customer@email.com",
  "subject": "Payment Proof Verified",
  "htmlContent": "<html>...</html>"
}
```

**Response:**
```json
{
  "message": "Email queued for sending",
  "to": "customer@email.com",
  "subject": "Payment Proof Verified"
}
```

## Notification Templates

### Verified Email
- Status indicator: Green ✓
- Shows order number and verified amount
- Indicates order will be processed soon

### Rejected Email  
- Status indicator: Red ✗
- Shows rejection reason
- Provides requirements for new submission
- Link to re-upload payment proof

## Frontend Flow

**Customer View:**
```
Payment Page
├── Show verification status badge (if proof uploaded)
│   ├── 🟢 Verified
│   ├── 🟡 Pending Verification
│   └── 🔴 Rejected
└── Upload/Re-upload proof
```

**Admin View:**
```
Payment Proofs Dashboard
├── Filter by status tabs
│   ├── All
│   ├── Unverified
│   ├── Pending
│   ├── Verified
│   └── Rejected
└── For each payment:
    ├── View proof (image/PDF)
    ├── Verify → Send confirmation email
    └── Reject → Send rejection email with reason
```

## Configuration

### Email Service Setup

**Option 1: Supabase Email (Recommended for Auth)**
```typescript
const { data, error } = await supabase.auth.admin.sendEmail({
  email: 'customer@email.com',
  subject: 'Payment Proof Verified',
  html: htmlContent,
})
```

**Option 2: SendGrid**
```bash
npm install @sendgrid/mail
```

```typescript
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
await sgMail.send({
  to: 'customer@email.com',
  from: 'noreply@bearions.com',
  subject: subject,
  html: htmlContent,
})
```

**Option 3: Resend**
```bash
npm install resend
```

```typescript
const { data, error } = await resend.emails.send({
  from: 'Bearions <noreply@bearions.com>',
  to: 'customer@email.com',
  subject: subject,
  html: htmlContent,
})
```

## Troubleshooting

### "Emails not sending"
- Check `/app/api/notifications/send-email.ts` logs
- Ensure email service credentials are set in environment variables
- Check spam folder for sent emails

### "Can't access Payment Proofs page"
- Ensure you're logged in as admin
- Check RLS policy is applied correctly
- Verify `admin_users` table has your user_id

### "Payment proof not showing in admin"
- Ensure customer has uploaded proof at `/payment/[orderNumber]`
- Check `payment_proof_url` is not null in database
- Verify payment record has correct `order_id`

## Future Enhancements

- [ ] Batch verification (approve multiple proofs at once)
- [ ] Custom rejection reason templates
- [ ] Automatic verification based on image analysis
- [ ] Payment proof version history
- [ ] Admin notes on each proof
- [ ] Payment proof statistics/dashboard
- [ ] Webhook notifications to external systems
- [ ] SMS notifications as fallback to email

## Support

For issues or questions:
1. Check this guide first
2. Review code comments in relevant files
3. Check Supabase logs
4. Review email service logs
