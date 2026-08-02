-- ============================================================
-- Shipping engine + promotions
-- ============================================================
-- Replaces the hardcoded Rp 15.000 flat fee with a real rate engine:
--
--   * parcels get a weight (actual vs volumetric, whichever is larger)
--   * addresses carry enough detail to be shippable abroad
--   * rates come from a zone table the CMS owns, or from a live courier
--     aggregator when one is configured — same shape either way
--   * promotions ("buy 5 items, free shipping") are rows, not code
--   * every order keeps an automatic tracking timeline
--
-- Safe to re-run.

-- ============================================================
-- 1. Products: what a parcel actually weighs
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS weight_grams INTEGER,
  ADD COLUMN IF NOT EXISTS length_cm NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS width_cm NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS hs_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS origin_country CHAR(2) DEFAULT 'ID';

COMMENT ON COLUMN products.weight_grams IS
  'Shipping weight in grams. NULL falls back to site_settings.shipping_default_weight_grams.';
COMMENT ON COLUMN products.hs_code IS
  'Harmonised System code, required on the customs form for international parcels.';

-- ============================================================
-- 2. Shipping addresses: make them work outside Indonesia
-- ============================================================

ALTER TABLE shipping_addresses
  ADD COLUMN IF NOT EXISTS country_code CHAR(2) NOT NULL DEFAULT 'ID',
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subdistrict VARCHAR(100),
  ADD COLUMN IF NOT EXISTS area_id VARCHAR(64);

-- Hong Kong, the UAE and parts of Ireland have no postcode at all, so a NOT NULL
-- postal_code would reject perfectly valid addresses. Validation moves to the
-- application, which knows which countries actually use one.
ALTER TABLE shipping_addresses
  ALTER COLUMN postal_code DROP NOT NULL;

-- Backfill the ISO code from the free-text country the old form wrote.
UPDATE shipping_addresses
SET country_code = 'ID'
WHERE country_code IS NULL
   OR (country IS NOT NULL AND LOWER(TRIM(country)) IN ('indonesia', 'id', 'idn'));

COMMENT ON COLUMN shipping_addresses.country_code IS 'ISO 3166-1 alpha-2. Drives domestic vs international rating.';
COMMENT ON COLUMN shipping_addresses.area_id IS 'Courier aggregator area id, when a live provider resolved this address.';

CREATE INDEX IF NOT EXISTS idx_shipping_addresses_country ON shipping_addresses(country_code);

-- ============================================================
-- 3. Site settings: where Bearion ships from, and with what
-- ============================================================

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS shipping_origin_label TEXT,
  ADD COLUMN IF NOT EXISTS shipping_origin_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_origin_city TEXT,
  ADD COLUMN IF NOT EXISTS shipping_origin_province TEXT,
  ADD COLUMN IF NOT EXISTS shipping_origin_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS shipping_origin_country_code CHAR(2) DEFAULT 'ID',
  ADD COLUMN IF NOT EXISTS shipping_origin_area_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_provider TEXT DEFAULT 'zone',
  ADD COLUMN IF NOT EXISTS shipping_default_weight_grams INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS shipping_volumetric_divisor INTEGER DEFAULT 6000,
  ADD COLUMN IF NOT EXISTS shipping_handling_fee NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_international_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS shipping_customs_note TEXT,
  ADD COLUMN IF NOT EXISTS shipping_customs_note_id TEXT;

-- 'zone'     = price from the shipping_zone_rates table below (no API key, always works)
-- 'biteship' = live multi-courier rates, falls back to 'zone' if the call fails
ALTER TABLE site_settings
  DROP CONSTRAINT IF EXISTS site_settings_shipping_provider_check;
ALTER TABLE site_settings
  ADD CONSTRAINT site_settings_shipping_provider_check
  CHECK (shipping_provider IN ('zone', 'biteship'));

UPDATE site_settings
SET
  shipping_origin_label = COALESCE(shipping_origin_label, 'Bearion Warehouse'),
  shipping_origin_address = COALESCE(shipping_origin_address, 'Jl. Merdeka No. 1'),
  shipping_origin_city = COALESCE(shipping_origin_city, 'Bandung'),
  shipping_origin_province = COALESCE(shipping_origin_province, 'Jawa Barat'),
  shipping_origin_postal_code = COALESCE(shipping_origin_postal_code, '40111'),
  shipping_origin_country_code = COALESCE(shipping_origin_country_code, 'ID'),
  shipping_provider = COALESCE(shipping_provider, 'zone'),
  shipping_default_weight_grams = COALESCE(shipping_default_weight_grams, 500),
  shipping_volumetric_divisor = COALESCE(shipping_volumetric_divisor, 6000),
  shipping_handling_fee = COALESCE(shipping_handling_fee, 0),
  shipping_international_enabled = COALESCE(shipping_international_enabled, TRUE),
  shipping_customs_note = COALESCE(
    shipping_customs_note,
    'Import duties and taxes are not included and are payable to the courier on delivery.'
  ),
  shipping_customs_note_id = COALESCE(
    shipping_customs_note_id,
    'Bea masuk dan pajak impor belum termasuk dan dibayarkan ke kurir saat paket tiba.'
  )
WHERE id = 1;

-- ============================================================
-- 4. Zone rate table — the always-available rate source
-- ============================================================

CREATE TABLE IF NOT EXISTS shipping_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  name_id VARCHAR(120),
  kind VARCHAR(20) NOT NULL DEFAULT 'domestic' CHECK (kind IN ('domestic', 'international')),

  -- Domestic zones match on province name, international zones on ISO country code.
  province_names TEXT[] DEFAULT '{}',
  country_codes TEXT[] DEFAULT '{}',

  -- Exactly one zone per kind should be the catch-all for unmatched destinations.
  is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_zone_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,

  courier_code VARCHAR(40) NOT NULL,
  courier_name VARCHAR(80) NOT NULL,
  service_code VARCHAR(40) NOT NULL,
  service_name VARCHAR(80) NOT NULL,

  -- cost = first_kg_cost + (billable_kg - 1) * next_kg_cost, billable_kg rounded up
  first_kg_cost NUMERIC(12, 2) NOT NULL,
  next_kg_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,

  etd_min_days INTEGER NOT NULL DEFAULT 1,
  etd_max_days INTEGER NOT NULL DEFAULT 3,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (zone_id, courier_code, service_code)
);

CREATE INDEX IF NOT EXISTS idx_shipping_zone_rates_zone ON shipping_zone_rates(zone_id);

-- ---- Seed: domestic zones -----------------------------------

INSERT INTO shipping_zones (code, name, name_id, kind, province_names, sort_order) VALUES
  ('ID-Z1', 'Greater Jakarta & West Java', 'Jabodetabek & Jawa Barat', 'domestic',
   ARRAY['DKI JAKARTA', 'JAWA BARAT', 'BANTEN'], 1),
  ('ID-Z2', 'Central & East Java', 'Jawa Tengah & Jawa Timur', 'domestic',
   ARRAY['JAWA TENGAH', 'DI YOGYAKARTA', 'DAERAH ISTIMEWA YOGYAKARTA', 'JAWA TIMUR'], 2),
  ('ID-Z3', 'Bali & Nusa Tenggara', 'Bali & Nusa Tenggara', 'domestic',
   ARRAY['BALI', 'NUSA TENGGARA BARAT', 'NUSA TENGGARA TIMUR'], 3),
  ('ID-Z4', 'Sumatra', 'Sumatera', 'domestic',
   ARRAY['ACEH', 'SUMATERA UTARA', 'SUMATERA BARAT', 'RIAU', 'KEPULAUAN RIAU', 'JAMBI',
         'SUMATERA SELATAN', 'KEPULAUAN BANGKA BELITUNG', 'BENGKULU', 'LAMPUNG'], 4),
  ('ID-Z5', 'Kalimantan', 'Kalimantan', 'domestic',
   ARRAY['KALIMANTAN BARAT', 'KALIMANTAN TENGAH', 'KALIMANTAN SELATAN',
         'KALIMANTAN TIMUR', 'KALIMANTAN UTARA'], 5),
  ('ID-Z6', 'Sulawesi', 'Sulawesi', 'domestic',
   ARRAY['SULAWESI UTARA', 'GORONTALO', 'SULAWESI TENGAH', 'SULAWESI BARAT',
         'SULAWESI SELATAN', 'SULAWESI TENGGARA'], 6),
  ('ID-Z7', 'Maluku & Papua', 'Maluku & Papua', 'domestic',
   ARRAY['MALUKU', 'MALUKU UTARA', 'PAPUA', 'PAPUA BARAT', 'PAPUA SELATAN',
         'PAPUA TENGAH', 'PAPUA PEGUNUNGAN', 'PAPUA BARAT DAYA'], 7)
ON CONFLICT (code) DO NOTHING;

-- Unmatched Indonesian province -> most expensive domestic zone, never free by accident.
INSERT INTO shipping_zones (code, name, name_id, kind, province_names, is_fallback, sort_order)
VALUES ('ID-ZX', 'Other Indonesian regions', 'Wilayah Indonesia lainnya', 'domestic', '{}', TRUE, 99)
ON CONFLICT (code) DO NOTHING;

-- ---- Seed: international zones ------------------------------

INSERT INTO shipping_zones (code, name, name_id, kind, country_codes, sort_order) VALUES
  ('INTL-ASEAN', 'Southeast Asia', 'Asia Tenggara', 'international',
   ARRAY['SG', 'MY', 'TH', 'VN', 'PH', 'BN', 'KH', 'LA', 'MM', 'TL'], 11),
  ('INTL-ASIA', 'East Asia, South Asia & Middle East', 'Asia Timur, Asia Selatan & Timur Tengah', 'international',
   ARRAY['JP', 'KR', 'CN', 'HK', 'MO', 'TW', 'IN', 'BD', 'LK', 'PK', 'AE', 'SA', 'QA', 'KW', 'BH', 'OM'], 12),
  ('INTL-OCEANIA', 'Australia & New Zealand', 'Australia & Selandia Baru', 'international',
   ARRAY['AU', 'NZ', 'PG', 'FJ'], 13),
  ('INTL-EUROPE', 'Europe', 'Eropa', 'international',
   ARRAY['GB', 'IE', 'DE', 'FR', 'NL', 'BE', 'LU', 'IT', 'ES', 'PT', 'AT', 'CH',
         'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'HU', 'GR', 'RO'], 14),
  ('INTL-AMERICAS', 'North & South America', 'Amerika Utara & Selatan', 'international',
   ARRAY['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE'], 15)
ON CONFLICT (code) DO NOTHING;

INSERT INTO shipping_zones (code, name, name_id, kind, country_codes, is_fallback, sort_order)
VALUES ('INTL-OTHER', 'Rest of world', 'Negara lainnya', 'international', '{}', TRUE, 98)
ON CONFLICT (code) DO NOTHING;

-- ---- Seed: rates --------------------------------------------
-- Indicative published tariffs from a Bandung/Jakarta origin. The CMS owns these
-- numbers — an admin is expected to tune them against real invoices.

INSERT INTO shipping_zone_rates
  (zone_id, courier_code, courier_name, service_code, service_name,
   first_kg_cost, next_kg_cost, etd_min_days, etd_max_days, sort_order)
SELECT z.id, r.courier_code, r.courier_name, r.service_code, r.service_name,
       r.first_kg, r.next_kg, r.etd_min, r.etd_max, r.sort_order
FROM (VALUES
  -- zone,      courier,    courier name, service, service name,        first,  next,  min, max, sort
  ('ID-Z1', 'jne',     'JNE',            'reg',  'Reguler',            12000,  9000, 2, 3, 1),
  ('ID-Z1', 'jne',     'JNE',            'yes',  'YES (Next Day)',     22000, 18000, 1, 1, 2),
  ('ID-Z1', 'jnt',     'J&T Express',    'ez',   'EZ',                 11000,  9000, 2, 3, 3),
  ('ID-Z1', 'sicepat', 'SiCepat',        'reg',  'REGULER',            10000,  9000, 2, 3, 4),

  ('ID-Z2', 'jne',     'JNE',            'reg',  'Reguler',            17000, 13000, 2, 4, 1),
  ('ID-Z2', 'jne',     'JNE',            'yes',  'YES (Next Day)',     28000, 22000, 1, 2, 2),
  ('ID-Z2', 'jnt',     'J&T Express',    'ez',   'EZ',                 16000, 13000, 2, 4, 3),
  ('ID-Z2', 'sicepat', 'SiCepat',        'reg',  'REGULER',            15000, 12000, 2, 4, 4),

  ('ID-Z3', 'jne',     'JNE',            'reg',  'Reguler',            24000, 19000, 3, 5, 1),
  ('ID-Z3', 'jne',     'JNE',            'yes',  'YES (Next Day)',     38000, 30000, 2, 3, 2),
  ('ID-Z3', 'jnt',     'J&T Express',    'ez',   'EZ',                 23000, 19000, 3, 5, 3),
  ('ID-Z3', 'sicepat', 'SiCepat',        'reg',  'REGULER',            22000, 18000, 3, 5, 4),

  ('ID-Z4', 'jne',     'JNE',            'reg',  'Reguler',            26000, 21000, 3, 6, 1),
  ('ID-Z4', 'jne',     'JNE',            'yes',  'YES (Next Day)',     42000, 34000, 2, 3, 2),
  ('ID-Z4', 'jnt',     'J&T Express',    'ez',   'EZ',                 25000, 21000, 3, 6, 3),
  ('ID-Z4', 'sicepat', 'SiCepat',        'reg',  'REGULER',            24000, 20000, 3, 6, 4),

  ('ID-Z5', 'jne',     'JNE',            'reg',  'Reguler',            30000, 25000, 4, 7, 1),
  ('ID-Z5', 'jne',     'JNE',            'yes',  'YES (Next Day)',     48000, 40000, 2, 4, 2),
  ('ID-Z5', 'jnt',     'J&T Express',    'ez',   'EZ',                 29000, 25000, 4, 7, 3),
  ('ID-Z5', 'sicepat', 'SiCepat',        'reg',  'REGULER',            28000, 24000, 4, 7, 4),

  ('ID-Z6', 'jne',     'JNE',            'reg',  'Reguler',            33000, 28000, 4, 7, 1),
  ('ID-Z6', 'jne',     'JNE',            'yes',  'YES (Next Day)',     52000, 44000, 3, 4, 2),
  ('ID-Z6', 'jnt',     'J&T Express',    'ez',   'EZ',                 32000, 28000, 4, 7, 3),
  ('ID-Z6', 'sicepat', 'SiCepat',        'reg',  'REGULER',            31000, 27000, 4, 7, 4),

  ('ID-Z7', 'jne',     'JNE',            'reg',  'Reguler',            48000, 42000,  6, 12, 1),
  ('ID-Z7', 'jnt',     'J&T Express',    'ez',   'EZ',                 47000, 42000,  6, 12, 2),
  ('ID-Z7', 'sicepat', 'SiCepat',        'reg',  'REGULER',            46000, 41000,  6, 12, 3),

  ('ID-ZX', 'jne',     'JNE',            'reg',  'Reguler',            48000, 42000,  6, 12, 1),
  ('ID-ZX', 'jnt',     'J&T Express',    'ez',   'EZ',                 47000, 42000,  6, 12, 2),

  ('INTL-ASEAN',    'pos', 'Pos Indonesia', 'ems', 'EMS International', 180000,  95000,  5,  9, 1),
  ('INTL-ASEAN',    'dhl', 'DHL Express',   'exp', 'Express Worldwide', 420000, 180000,  2,  4, 2),

  ('INTL-ASIA',     'pos', 'Pos Indonesia', 'ems', 'EMS International', 250000, 130000,  6, 12, 1),
  ('INTL-ASIA',     'dhl', 'DHL Express',   'exp', 'Express Worldwide', 520000, 220000,  2,  5, 2),

  ('INTL-OCEANIA',  'pos', 'Pos Indonesia', 'ems', 'EMS International', 320000, 170000,  7, 14, 1),
  ('INTL-OCEANIA',  'dhl', 'DHL Express',   'exp', 'Express Worldwide', 620000, 260000,  3,  6, 2),

  ('INTL-EUROPE',   'pos', 'Pos Indonesia', 'ems', 'EMS International', 420000, 220000,  8, 16, 1),
  ('INTL-EUROPE',   'dhl', 'DHL Express',   'exp', 'Express Worldwide', 780000, 320000,  3,  6, 2),

  ('INTL-AMERICAS', 'pos', 'Pos Indonesia', 'ems', 'EMS International', 450000, 240000,  9, 18, 1),
  ('INTL-AMERICAS', 'dhl', 'DHL Express',   'exp', 'Express Worldwide', 850000, 350000,  3,  7, 2),

  ('INTL-OTHER',    'pos', 'Pos Indonesia', 'ems', 'EMS International', 520000, 280000, 10, 21, 1),
  ('INTL-OTHER',    'dhl', 'DHL Express',   'exp', 'Express Worldwide', 980000, 420000,  4,  9, 2)
) AS r(zone_code, courier_code, courier_name, service_code, service_name,
       first_kg, next_kg, etd_min, etd_max, sort_order)
JOIN shipping_zones z ON z.code = r.zone_code
ON CONFLICT (zone_id, courier_code, service_code) DO NOTHING;

-- ============================================================
-- 5. Promotions — free shipping and discount rules as data
-- ============================================================

CREATE TABLE IF NOT EXISTS shipping_promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  name VARCHAR(120) NOT NULL,
  name_id VARCHAR(120),
  description TEXT,
  description_id TEXT,

  -- What the customer gets.
  reward_type VARCHAR(30) NOT NULL CHECK (reward_type IN (
    'free_shipping',      -- shipping cost -> 0
    'shipping_percent',   -- % off shipping, capped by max_discount
    'shipping_fixed',     -- flat IDR off shipping
    'order_percent',      -- % off subtotal, capped by max_discount
    'order_fixed'         -- flat IDR off subtotal
  )),
  reward_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  max_discount NUMERIC(12, 2),

  -- When it fires.
  condition_type VARCHAR(30) NOT NULL DEFAULT 'always' CHECK (condition_type IN (
    'always',
    'min_items',       -- total quantity in the cart
    'min_subtotal',    -- IDR before shipping and tax
    'min_weight'       -- billable grams
  )),
  condition_value NUMERIC(12, 2) NOT NULL DEFAULT 0,

  -- Where it applies.
  scope VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (scope IN ('all', 'domestic', 'international')),
  country_codes TEXT[] DEFAULT '{}',   -- empty = every country inside `scope`
  courier_codes TEXT[] DEFAULT '{}',   -- empty = every courier

  -- How it combines. Stackable promos all apply; among the rest only the single
  -- best one does, so two "free shipping" rules can never double-refund.
  stackable BOOLEAN NOT NULL DEFAULT FALSE,
  priority INTEGER NOT NULL DEFAULT 0,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_promotions_active
  ON shipping_promotions(is_active, priority DESC);

-- The rule the client asked for, ready to demo. Deactivate rather than delete
-- if it is not wanted.
INSERT INTO shipping_promotions
  (name, name_id, description, description_id, reward_type, reward_value,
   condition_type, condition_value, scope, priority, is_active)
SELECT
  'Free shipping on 5+ items',
  'Gratis ongkir untuk 5+ item',
  'Order 5 items or more and shipping is on us.',
  'Belanja 5 item atau lebih, ongkir ditanggung Bearion.',
  'free_shipping', 0,
  'min_items', 5,
  'domestic', 100, TRUE
WHERE NOT EXISTS (SELECT 1 FROM shipping_promotions);

-- ============================================================
-- 6. Orders: record which rate and which promo were used
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_courier_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS shipping_service_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS shipping_service_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS shipping_base_cost NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_discount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_etd_min_days INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_etd_max_days INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_weight_grams INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_zone_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS shipping_provider VARCHAR(30),
  ADD COLUMN IF NOT EXISTS applied_promotions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fx_rate_idr_usd NUMERIC(14, 4);

COMMENT ON COLUMN orders.shipping_base_cost IS 'Courier price before any promotion. shipping_cost is what the customer actually paid.';
COMMENT ON COLUMN orders.applied_promotions IS 'Snapshot of the promotion rows that fired, so a later edit cannot rewrite history.';
COMMENT ON COLUMN orders.fx_rate_idr_usd IS 'IDR per USD locked at checkout, so the USD total cannot drift before payment.';

-- ============================================================
-- 7. Tracking timeline, filled in automatically
-- ============================================================

CREATE TABLE IF NOT EXISTS order_tracking_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- 'system'  = generated by the order lifecycle trigger below
  -- 'courier' = a real scan pulled from the courier / aggregator
  source VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'courier')),

  status VARCHAR(60) NOT NULL,
  description TEXT,
  description_id TEXT,
  location VARCHAR(160),
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Polling the courier repeatedly must not duplicate rows.
  dedupe_key TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (order_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_order_tracking_events_order
  ON order_tracking_events(order_id, event_time DESC);

-- Orders that still need polling, so the sync job can find them cheaply.
CREATE INDEX IF NOT EXISTS idx_orders_awaiting_tracking
  ON orders(status) WHERE tracking_number IS NOT NULL AND status = 'shipped';

CREATE OR REPLACE FUNCTION log_order_tracking_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_tracking_events (order_id, source, status, description, description_id, dedupe_key, event_time)
    VALUES (NEW.id, 'system', 'order_placed',
            'Order placed and waiting for payment.',
            'Pesanan dibuat dan menunggu pembayaran.',
            'system:order_placed', NEW.created_at)
    ON CONFLICT (order_id, dedupe_key) DO NOTHING;
    RETURN NEW;
  END IF;

  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    INSERT INTO order_tracking_events (order_id, source, status, description, description_id, dedupe_key)
    VALUES (NEW.id, 'system', 'payment_confirmed',
            'Payment confirmed.',
            'Pembayaran dikonfirmasi.',
            'system:payment_confirmed')
    ON CONFLICT (order_id, dedupe_key) DO NOTHING;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_tracking_events (order_id, source, status, description, description_id, dedupe_key)
    VALUES (
      NEW.id, 'system', 'status_' || NEW.status,
      CASE NEW.status
        WHEN 'confirmed' THEN 'Order confirmed by Bearion.'
        WHEN 'processing' THEN 'Your order is being packed.'
        WHEN 'shipped' THEN 'Parcel handed over to the courier.'
        WHEN 'delivered' THEN 'Parcel delivered.'
        WHEN 'cancelled' THEN 'Order cancelled.'
        WHEN 'refunded' THEN 'Order refunded.'
        ELSE 'Order status updated to ' || NEW.status || '.'
      END,
      CASE NEW.status
        WHEN 'confirmed' THEN 'Pesanan dikonfirmasi oleh Bearion.'
        WHEN 'processing' THEN 'Pesanan sedang dikemas.'
        WHEN 'shipped' THEN 'Paket telah diserahkan ke kurir.'
        WHEN 'delivered' THEN 'Paket telah diterima.'
        WHEN 'cancelled' THEN 'Pesanan dibatalkan.'
        WHEN 'refunded' THEN 'Pesanan dikembalikan.'
        ELSE 'Status pesanan diperbarui menjadi ' || NEW.status || '.'
      END,
      'system:status_' || NEW.status
    )
    ON CONFLICT (order_id, dedupe_key) DO NOTHING;
  END IF;

  IF NEW.tracking_number IS NOT NULL AND NEW.tracking_number IS DISTINCT FROM OLD.tracking_number THEN
    INSERT INTO order_tracking_events (order_id, source, status, description, description_id, dedupe_key)
    VALUES (NEW.id, 'system', 'awb_assigned',
            'Tracking number ' || NEW.tracking_number || ' assigned.',
            'Nomor resi ' || NEW.tracking_number || ' diterbitkan.',
            'system:awb:' || NEW.tracking_number)
    ON CONFLICT (order_id, dedupe_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_tracking_insert ON orders;
CREATE TRIGGER trg_orders_tracking_insert
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_tracking_event();

DROP TRIGGER IF EXISTS trg_orders_tracking_update ON orders;
CREATE TRIGGER trg_orders_tracking_update
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_tracking_event();

-- Backfill a starting event for orders that predate the trigger.
INSERT INTO order_tracking_events (order_id, source, status, description, description_id, dedupe_key, event_time)
SELECT o.id, 'system', 'order_placed',
       'Order placed and waiting for payment.',
       'Pesanan dibuat dan menunggu pembayaran.',
       'system:order_placed', o.created_at
FROM orders o
ON CONFLICT (order_id, dedupe_key) DO NOTHING;

-- ============================================================
-- 8. Promotion usage counter
-- ============================================================

CREATE OR REPLACE FUNCTION increment_promotion_usage(promotion_ids UUID[])
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE shipping_promotions
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = ANY(promotion_ids);
$$;

-- SECURITY DEFINER means this bypasses RLS, so it must not be callable over the
-- public API. Left open, anyone could burn through a promotion's usage_limit by
-- calling it in a loop. Only the order-create route (service role) needs it.
REVOKE ALL ON FUNCTION increment_promotion_usage(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_promotion_usage(UUID[]) TO service_role;

-- ============================================================
-- 9. Row level security
-- ============================================================

ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zone_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking_events ENABLE ROW LEVEL SECURITY;

-- Rate cards are public: the storefront quotes them before anyone logs in.
DROP POLICY IF EXISTS "Public can read active shipping zones" ON shipping_zones;
CREATE POLICY "Public can read active shipping zones"
  ON shipping_zones FOR SELECT TO public USING (is_active);

DROP POLICY IF EXISTS "Admins manage shipping zones" ON shipping_zones;
CREATE POLICY "Admins manage shipping zones"
  ON shipping_zones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));

DROP POLICY IF EXISTS "Public can read active zone rates" ON shipping_zone_rates;
CREATE POLICY "Public can read active zone rates"
  ON shipping_zone_rates FOR SELECT TO public USING (is_active);

DROP POLICY IF EXISTS "Admins manage zone rates" ON shipping_zone_rates;
CREATE POLICY "Admins manage zone rates"
  ON shipping_zone_rates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));

-- Shoppers need to see live promos to know what they are close to unlocking.
DROP POLICY IF EXISTS "Public can read active promotions" ON shipping_promotions;
CREATE POLICY "Public can read active promotions"
  ON shipping_promotions FOR SELECT TO public
  USING (
    is_active
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at >= NOW())
  );

DROP POLICY IF EXISTS "Admins manage promotions" ON shipping_promotions;
CREATE POLICY "Admins manage promotions"
  ON shipping_promotions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));

-- Tracking is per-order and read-only to customers; only the service role writes.
DROP POLICY IF EXISTS "Users read tracking for their orders" ON order_tracking_events;
CREATE POLICY "Users read tracking for their orders"
  ON order_tracking_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_tracking_events.order_id
        AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins read all tracking" ON order_tracking_events;
CREATE POLICY "Admins read all tracking"
  ON order_tracking_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));

-- ============================================================
-- 10. updated_at triggers
-- ============================================================

DROP TRIGGER IF EXISTS update_shipping_zones_updated_at ON shipping_zones;
CREATE TRIGGER update_shipping_zones_updated_at
  BEFORE UPDATE ON shipping_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shipping_zone_rates_updated_at ON shipping_zone_rates;
CREATE TRIGGER update_shipping_zone_rates_updated_at
  BEFORE UPDATE ON shipping_zone_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shipping_promotions_updated_at ON shipping_promotions;
CREATE TRIGGER update_shipping_promotions_updated_at
  BEFORE UPDATE ON shipping_promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
