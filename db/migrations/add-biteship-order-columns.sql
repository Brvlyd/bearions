-- Biteship shipment booking, tracked separately from our own order.status.
--
-- Biteship has no label/PDF API (confirmed against their docs: "you'll need
-- to set up your own shipping label system") so there is no label_url column
-- here — the printable resi is rendered by us from this data plus the
-- existing shipping snapshot columns. tracking_number (pre-existing) is
-- reused for the Biteship-issued waybill_id once a shipment is booked, which
-- is what lets the existing tracking sync (lib/tracking.ts) pick it up with
-- no further changes.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS biteship_order_id VARCHAR(60),
  ADD COLUMN IF NOT EXISTS biteship_status VARCHAR(40);

COMMENT ON COLUMN orders.biteship_order_id IS 'Biteship''s own order id, returned by POST /v1/orders. Presence marks a shipment as already booked (idempotency guard).';
COMMENT ON COLUMN orders.biteship_status IS 'Biteship''s shipment lifecycle status (confirmed, allocated, picking_up, ...), distinct from orders.status.';
