-- Per-product colour variants, editable from Admin > Products > Add/Edit.
--
-- Colour used to be a fixed five-item list in lib/product-options.ts shared by
-- every product, so a hoodie sold in Maroon could only be ordered as "Black".
-- This table lets each product carry its own colours, each with the photo of
-- the garment in that colour — which is what the storefront pops up when a
-- shopper taps a swatch.
--
-- A product with no rows here keeps falling back to the shared default list,
-- so nothing breaks before an admin has filled anything in.

CREATE TABLE IF NOT EXISTS product_colors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  -- Stored on cart_items/order_items as free text, so this name is the value
  -- the customer's order is written with. Renaming a colour does not rewrite
  -- orders already placed, which is deliberate.
  name TEXT NOT NULL,
  name_id TEXT,
  -- CSS colour for the swatch dot. Null renders a neutral placeholder dot.
  hex_code TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_order ON product_colors(product_id, display_order);

-- Two swatches with the same name would put an ambiguous value on an order.
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_colors_unique_name
  ON product_colors(product_id, lower(name));

ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;

-- Storefront reads these anonymously, same as product_images.
DROP POLICY IF EXISTS "Public product colors are viewable by everyone" ON product_colors;
CREATE POLICY "Public product colors are viewable by everyone"
ON product_colors FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Admins can insert product colors" ON product_colors;
CREATE POLICY "Admins can insert product colors"
ON product_colors FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can update product colors" ON product_colors;
CREATE POLICY "Admins can update product colors"
ON product_colors FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete product colors" ON product_colors;
CREATE POLICY "Admins can delete product colors"
ON product_colors FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())
);

COMMENT ON TABLE product_colors IS 'Colour variants per product. Empty means the product uses the shared default colour list.';
COMMENT ON COLUMN product_colors.name IS 'English name; also the value written to cart_items.color and order_items.color.';
COMMENT ON COLUMN product_colors.image_url IS 'Photo of this product in this colour, shown in the storefront colour popup.';
