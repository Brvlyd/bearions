# Fix Payment Proof Verification RLS Error

## Problem
The admin payment proof verification is failing with:
- 406 error on `admins` table SELECT
- 403 Forbidden on the `/api/admin/payment-proofs/review` endpoint

## Root Cause
The `admins` table RLS policy doesn't allow users to read their own admin record, preventing the API from verifying if the user is an admin.

## Solution

### Step 1: Apply RLS Fix in Supabase

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create a new query and paste the contents of [fix-admin-verification-rls.sql](../../db/fixes/fix-admin-verification-rls.sql)
3. Click **Run**

This adds a policy that allows:
- Each admin to read their own record from the `admins` table
- Authentication grant for the admins table

### Step 2: Verify Payment Proof Table RLS

Make sure the `payments` table has an UPDATE policy for admins:

```sql
-- Check existing policies on payments table
SELECT * FROM pg_policies 
WHERE tablename = 'payments';

-- If missing, add this policy:
CREATE POLICY "admins_update_payment_proof_status"
ON payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  )
);
```

### Step 3: Test

1. Go to admin dashboard → Orders
2. Click on an order with payment proof
3. Click "Approve" or "Reject" button
4. Should work without 403 error ✅

## Technical Details

The issue was:
```
GET /admins?id=eq.USER_ID 406 (Not Acceptable)
POST /api/admin/payment-proofs/review 403 (Forbidden)
```

The API endpoint does:
1. Extract user ID from access token
2. Query `SELECT * FROM admins WHERE id = user_id` to verify admin
3. If query fails (406/403), return 403 Forbidden

Now the policy allows step 2 to succeed.

## Files Changed
- [fix-admin-verification-rls.sql](../../db/fixes/fix-admin-verification-rls.sql) - RLS policy fix
