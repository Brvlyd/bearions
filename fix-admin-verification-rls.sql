-- Fix: Allow admins to read their own admin record for verification
-- This enables the API endpoint to check if a user is an admin

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "admins_select_own_record" ON admins;

-- Create new policy allowing admins to read their own admin record
CREATE POLICY "admins_select_own_record"
ON admins
FOR SELECT
USING (auth.uid() = id);

-- Verify the policy is set
GRANT SELECT ON admins TO anon, authenticated;
