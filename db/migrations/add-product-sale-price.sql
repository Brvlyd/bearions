-- Optional sale price per product, shown as a discounted IDR price in the storefront.
-- When set lower than the base IDR price, the original price is shown crossed out.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);

COMMENT ON COLUMN products.sale_price IS
  'Optional discounted IDR price. NULL means no discount.';
