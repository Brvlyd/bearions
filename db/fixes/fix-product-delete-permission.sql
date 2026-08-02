-- Fix product delete permissions for admins

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can delete products" ON products;

-- Allow admins to delete products
CREATE POLICY "Admins can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE id = auth.uid()
    )
  );

-- Also ensure product_images can be deleted
DROP POLICY IF EXISTS "Admins can delete product images" ON product_images;

CREATE POLICY "Admins can delete product images"
  ON product_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE id = auth.uid()
    )
  );

-- Verify current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('products', 'product_images')
ORDER BY tablename, policyname;
