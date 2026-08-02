-- Tightens two storage buckets that were far more open than intended.
--
-- 1) product-images: INSERT/UPDATE/DELETE was granted to `TO authenticated`
--    with no further check — i.e. any signed-up customer (not just admins)
--    could replace or delete product photos storefront-wide. Products
--    themselves already require admin for writes (database-schema.sql); the
--    bucket now matches that.
--
-- 2) uploads/payment-proofs: SELECT was `TO public` with no ownership check,
--    so anyone with the URL pattern (or who lists the bucket) could view any
--    customer's payment proof — these often contain bank account numbers and
--    full names. UPDATE/DELETE was `TO authenticated` with no ownership
--    check either, so any signed-in customer could remove or overwrite
--    another customer's proof. Access is now scoped to the uploading
--    customer or an admin, using the paymentId embedded in the object name
--    (lib/payments.ts writes files as `payment-proofs/{paymentId}-{ts}.ext`).
--
-- Run after storage-setup.sql and add-payment-proof-storage-policy.sql.

-- ============================================
-- product-images: admin-only writes
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
);

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
);

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
);

-- ============================================
-- uploads/payment-proofs: owner-or-admin only
-- ============================================

-- Compares as text, never casts the extracted fragment to uuid, so a
-- malformed object name fails the match instead of throwing.
CREATE OR REPLACE FUNCTION storage_owns_payment_proof(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM payments
    JOIN orders ON orders.id = payments.order_id
    WHERE payments.id::text = substring(object_name from 16 for 36)
      AND orders.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION storage_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
$$;

DROP POLICY IF EXISTS "Public can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete payment proofs" ON storage.objects;

CREATE POLICY "Owner or admin can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads'
  AND name LIKE 'payment-proofs/%'
  AND (storage_owns_payment_proof(name) OR storage_is_admin())
);

CREATE POLICY "Owner can upload their payment proof"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND name LIKE 'payment-proofs/%'
  AND storage_owns_payment_proof(name)
);

CREATE POLICY "Admins can update payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND name LIKE 'payment-proofs/%'
  AND storage_is_admin()
);

CREATE POLICY "Admins can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND name LIKE 'payment-proofs/%'
  AND storage_is_admin()
);

-- The `uploads` bucket itself was still flagged `public` at this point,
-- which means a direct object URL served through Supabase's CDN path could
-- bypass RLS entirely. See make-payment-proofs-bucket-private.sql, which
-- flips the bucket private and pairs with the app switching to signed URLs
-- for proof access.
