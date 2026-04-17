-- Fix admin access for orders verification pages
-- Problem: admin policies referenced users.role='admin', while active admins usually exist in admins table.

-- Orders policies
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;

CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admins can update orders"
ON orders FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Order items policies
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;

CREATE POLICY "Admins can view all order items"
ON order_items FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Payments policies
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;

CREATE POLICY "Admins can view all payments"
ON payments FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Shipping addresses policies (needed so admin can inspect destination details)
DROP POLICY IF EXISTS "Admins can view all shipping addresses" ON shipping_addresses;

CREATE POLICY "Admins can view all shipping addresses"
ON shipping_addresses FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
