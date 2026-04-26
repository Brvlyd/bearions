-- =====================================================
-- Payment Proof Verification System
-- =====================================================
-- This migration adds payment proof verification workflow
-- to the Bearions payment system.
--
-- Features:
-- - Track proof verification status (unverified, pending, verified, rejected)
-- - Store which admin verified the proof and when
-- - Enable admin verification UI in dashboard
-- =====================================================

-- Add new columns to payments table for proof verification
ALTER TABLE payments 
ADD COLUMN proof_verification_status VARCHAR(20) DEFAULT 'unverified',
ADD COLUMN proof_verified_by UUID,
ADD COLUMN proof_verified_at TIMESTAMP;

-- Create index for faster filtering by verification status
CREATE INDEX idx_payments_proof_verification_status 
ON payments(proof_verification_status);

-- Create index for finding payments verified by a specific admin
CREATE INDEX idx_payments_proof_verified_by 
ON payments(proof_verified_by);

-- Add comments to document the new columns
COMMENT ON COLUMN payments.proof_verification_status 
IS 'Status of payment proof verification: unverified (default), pending (in review), verified (approved), rejected (declined)';

COMMENT ON COLUMN payments.proof_verified_by 
IS 'User ID of the admin who verified/rejected the payment proof';

COMMENT ON COLUMN payments.proof_verified_at 
IS 'Timestamp when the payment proof was verified or rejected';

-- Update RLS policy to allow admin users to update payment proof verification
-- This policy grants update permission to admins to set verification status
CREATE POLICY "Allow admin to update payment proof verification"
ON payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- INSTALLATION INSTRUCTIONS
-- =====================================================
-- 1. Go to Supabase Console
-- 2. Navigate to SQL Editor
-- 3. Paste this entire script
-- 4. Click "Run"
-- 
-- After running this migration:
-- - Admin dashboard will have new "Payment Proofs" menu item
-- - Admins can verify/reject customer payment proofs
-- - Customers receive email notifications when proof is verified/rejected
-- - Orders cannot proceed until proof is verified
--
-- =====================================================

