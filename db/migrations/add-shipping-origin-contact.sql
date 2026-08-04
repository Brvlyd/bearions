-- Sender contact info required by Biteship's Create Order endpoint
-- (origin_contact_name / origin_contact_phone), which nothing in the
-- shipping settings captured before this — rates and tracking never needed
-- a sender identity, only an address.

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS shipping_origin_contact_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS shipping_origin_contact_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS shipping_origin_collection_method VARCHAR(20) NOT NULL DEFAULT 'pickup';

COMMENT ON COLUMN site_settings.shipping_origin_contact_name IS 'Sender name Biteship shows the courier/recipient — required to book a shipment.';
COMMENT ON COLUMN site_settings.shipping_origin_contact_phone IS 'Sender phone Biteship shows the courier/recipient — required to book a shipment.';
COMMENT ON COLUMN site_settings.shipping_origin_collection_method IS '''pickup'' (courier collects from the store) or ''drop_off'' (store drops the parcel at a courier point).';
