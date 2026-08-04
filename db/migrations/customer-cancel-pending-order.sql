-- Lets a customer cancel their own still-pending order (POST /api/orders/[orderNumber]/cancel).
-- Run this in Supabase SQL Editor.
--
-- Stock for a cart is decremented the moment order_items are inserted (see
-- update_product_stock_after_order in cart-orders-schema.sql), not when the
-- order is actually paid. Cancelling a pending order must therefore give that
-- stock back, or it leaks out of availability forever every time a customer
-- backs out of an unpaid order.

CREATE OR REPLACE FUNCTION restore_order_stock(target_order_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE products
  SET stock = products.stock + order_items.quantity
  FROM order_items
  WHERE order_items.order_id = target_order_id
    AND order_items.product_id = products.id;
$$;

-- SECURITY DEFINER bypasses RLS, so this must not be callable over the public
-- API. Only the cancel-order route (service role) needs it.
REVOKE ALL ON FUNCTION restore_order_stock(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION restore_order_stock(UUID) TO service_role;
