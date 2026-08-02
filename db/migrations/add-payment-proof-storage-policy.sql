-- Payment proof upload policies for uploads bucket
-- This policy scopes access to files under payment-proofs/ path.

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public can view payment proofs" ON storage.objects;

CREATE POLICY "Public can view payment proofs"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'uploads'
  AND name LIKE 'payment-proofs/%'
);

CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND name LIKE 'payment-proofs/%'
);

CREATE POLICY "Authenticated users can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads'
  AND name LIKE 'payment-proofs/%'
);

CREATE POLICY "Authenticated users can update payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND name LIKE 'payment-proofs/%'
)
WITH CHECK (
  bucket_id = 'uploads'
  AND name LIKE 'payment-proofs/%'
);

CREATE POLICY "Authenticated users can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND name LIKE 'payment-proofs/%'
);
