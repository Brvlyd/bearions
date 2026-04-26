-- Payment methods configuration table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(60) UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  provider_name TEXT,
  account_name TEXT,
  account_number TEXT,
  requires_proof BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_active_order
  ON payment_methods (is_active DESC, sort_order ASC, created_at ASC);

INSERT INTO payment_methods (
  code,
  display_name,
  description,
  instructions,
  provider_name,
  account_name,
  account_number,
  requires_proof,
  is_active,
  sort_order
)
VALUES (
  'bank_transfer',
  'Manual Bank Transfer',
  'Transfer manually and upload payment proof for verification.',
  'Transfer sesuai total pembayaran lalu upload bukti pembayaran.',
  'Bank Mandiri',
  'BENEDICTUS RIVOLLY A',
  '1360037247548',
  true,
  true,
  1
)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to payment_methods" ON payment_methods;
CREATE POLICY "Allow public read access to payment_methods"
  ON payment_methods
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow admins to manage payment_methods" ON payment_methods;
CREATE POLICY "Allow admins to manage payment_methods"
  ON payment_methods
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.id = auth.uid()
    )
  );
