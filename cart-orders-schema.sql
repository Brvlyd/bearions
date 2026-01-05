-- Cart Schema for Bearions E-commerce
-- This schema handles shopping cart, orders, payments, and shipping

-- ============================================
-- CART TABLES
-- ============================================

-- Cart table - stores user shopping carts
CREATE TABLE IF NOT EXISTS carts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart items table - stores items in each cart
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  size VARCHAR(10),
  color VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cart_id, product_id, size, color)
);

-- ============================================
-- SHIPPING TABLES
-- ============================================

-- Shipping addresses table (created before orders because orders references it)
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Address details
  recipient_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Indonesia',
  
  -- Address flags
  is_default BOOLEAN DEFAULT FALSE,
  label VARCHAR(50), -- e.g., 'Home', 'Office', etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ORDER TABLES
-- ============================================

-- Orders table - stores customer orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Customer information
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  
  -- Order totals
  subtotal DECIMAL(12, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  
  -- Order status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status options: pending, confirmed, processing, shipped, delivered, cancelled, refunded
  
  -- Payment information
  payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  -- Payment status options: unpaid, pending, paid, failed, refunded
  payment_method VARCHAR(50),
  -- Payment methods: bank_transfer, credit_card, e_wallet, cod
  
  -- Shipping information
  shipping_address_id UUID REFERENCES shipping_addresses(id),
  tracking_number VARCHAR(100),
  courier VARCHAR(100),
  estimated_delivery DATE,
  
  -- Notes
  customer_notes TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Order items table - stores items in each order
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  
  -- Product snapshot (in case product is deleted/modified later)
  product_name VARCHAR(255) NOT NULL,
  product_image_url TEXT,
  product_sku VARCHAR(100),
  
  -- Order item details
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  size VARCHAR(10),
  color VARCHAR(50),
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYMENT TABLES
-- ============================================

-- Payments table - stores payment transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Payment details
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  
  -- Payment status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status options: pending, processing, success, failed, expired, cancelled, refunded
  
  -- Payment gateway information
  payment_gateway VARCHAR(50), -- e.g., 'midtrans', 'stripe', 'manual'
  transaction_id VARCHAR(255), -- Gateway transaction ID
  payment_token VARCHAR(255), -- Payment token from gateway
  payment_url TEXT, -- Payment URL for redirect
  
  -- Payment proof (for manual payment)
  payment_proof_url TEXT,
  
  -- Payment metadata
  gateway_response JSONB, -- Store full gateway response
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- WISHLIST TABLE
-- ============================================

-- Wishlist table - stores user wishlists
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============================================
-- REVIEWS TABLE
-- ============================================

-- Product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  
  -- Review images
  images JSONB, -- Array of image URLs
  
  -- Review status
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Cart indexes
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Shipping address indexes
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user_id ON shipping_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_is_default ON shipping_addresses(user_id, is_default);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Wishlist indexes
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);

-- Review indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_is_published ON product_reviews(product_id, is_published);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Cart policies
CREATE POLICY "Users can view their own cart" ON carts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cart" ON carts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cart" ON carts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cart" ON carts FOR DELETE USING (auth.uid() = user_id);

-- Cart items policies
CREATE POLICY "Users can view their cart items" ON cart_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));
CREATE POLICY "Users can add items to their cart" ON cart_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));
CREATE POLICY "Users can update their cart items" ON cart_items FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));
CREATE POLICY "Users can delete their cart items" ON cart_items FOR DELETE 
  USING (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));

-- Order policies
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
CREATE POLICY "Admins can update orders" ON orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Order items policies
CREATE POLICY "Users can view their order items" ON order_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can create order items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Shipping address policies
CREATE POLICY "Users can view their addresses" ON shipping_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create addresses" ON shipping_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their addresses" ON shipping_addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their addresses" ON shipping_addresses FOR DELETE USING (auth.uid() = user_id);

-- Payment policies
CREATE POLICY "Users can view their payments" ON payments FOR SELECT 
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can create payments" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all payments" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Wishlist policies
CREATE POLICY "Users can view their wishlist" ON wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to wishlist" ON wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from wishlist" ON wishlists FOR DELETE USING (auth.uid() = user_id);

-- Review policies
CREATE POLICY "Anyone can view published reviews" ON product_reviews FOR SELECT USING (is_published = true);
CREATE POLICY "Users can create reviews" ON product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their reviews" ON product_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their reviews" ON product_reviews FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_addresses_updated_at BEFORE UPDATE ON shipping_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_order_number TEXT;
  prefix TEXT := 'BRN';
  date_part TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
  random_part TEXT;
BEGIN
  random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  new_order_number := prefix || date_part || random_part;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM orders WHERE order_number = new_order_number) LOOP
    random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    new_order_number := prefix || date_part || random_part;
  END LOOP;
  
  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update product stock after order
CREATE OR REPLACE FUNCTION update_product_stock_after_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease product stock
  UPDATE products 
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stock when order item is created
CREATE TRIGGER update_stock_on_order_item_insert
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_after_order();

-- ============================================
-- VIEWS
-- ============================================

-- View for order summary with items
CREATE OR REPLACE VIEW order_summary AS
SELECT 
  o.id,
  o.order_number,
  o.user_id,
  o.customer_name,
  o.customer_email,
  o.customer_phone,
  o.total,
  o.status,
  o.payment_status,
  o.payment_method,
  o.created_at,
  COUNT(oi.id) as item_count,
  SUM(oi.quantity) as total_items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;

-- View for cart summary
CREATE OR REPLACE VIEW cart_summary AS
SELECT 
  c.id as cart_id,
  c.user_id,
  COUNT(ci.id) as item_count,
  SUM(ci.quantity) as total_items,
  SUM(ci.quantity * p.price) as subtotal
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
LEFT JOIN products p ON ci.product_id = p.id
GROUP BY c.id, c.user_id;

-- View for product ratings
CREATE OR REPLACE VIEW product_ratings AS
SELECT 
  product_id,
  COUNT(*) as review_count,
  AVG(rating) as average_rating,
  COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
  COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
  COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
  COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
  COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
FROM product_reviews
WHERE is_published = true
GROUP BY product_id;
