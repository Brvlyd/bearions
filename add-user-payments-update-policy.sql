-- Allow users to update their own payment records (for uploading payment proof)
DROP POLICY IF EXISTS "Users can update their payments" ON payments;

CREATE POLICY "Users can update their payments"
ON payments FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM orders
    WHERE orders.id = payments.order_id
      AND orders.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM orders
    WHERE orders.id = payments.order_id
      AND orders.user_id = auth.uid()
  )
);
