-- Optional USD price per product, set by hand in the admin CMS.
-- Nothing converts IDR -> USD for display: a product without a USD price
-- simply keeps showing its IDR price in every language.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10, 2);

COMMENT ON COLUMN products.price_usd IS
  'Manual USD price shown to English visitors. NULL = no USD price, fall back to price (IDR).';
