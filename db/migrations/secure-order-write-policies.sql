-- Closes a critical hole: orders, order_items, and payments all had an
-- INSERT policy of `WITH CHECK (true)`. Because the Supabase anon key ships
-- in the browser bundle, anyone could call the Supabase REST API directly
-- (no need to go through the Next.js app at all) and insert a row with any
-- price, any total, any user_id they liked — e.g. an order for Rp 1, or an
-- order attributed to another customer.
--
-- Order creation now happens exclusively through the service-role API route
-- at app/api/orders/create, which recomputes every price and total from the
-- products table and ignores whatever the client sends. That route bypasses
-- RLS entirely (it authenticates the caller itself), so these tables no
-- longer need an INSERT policy for the anon/authenticated roles at all.
--
-- Run this in the Supabase SQL editor after deploying the new order flow.
-- Run add-user-payments-update-policy.sql and fix-admin-orders-rls.sql first
-- if you have not already (this file assumes those UPDATE/SELECT policies
-- are in place and only touches INSERT).

DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;
DROP POLICY IF EXISTS "Users can create payments" ON payments;

-- No replacement INSERT policy: rows are written only by the service role
-- (via the API route), which is not subject to RLS. If a legitimate
-- client-side insert path is ever reintroduced, scope it tightly, e.g.:
--   WITH CHECK (auth.uid() = user_id)
-- and never trust client-supplied price/subtotal/total columns.
