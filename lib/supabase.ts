import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iktbpmqahpkboovgbbib.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_U1bLx1ViEflYjYCCaEJR6w_yTqsN-PK'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Product = {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  category: string
  image_url: string | null
  created_at: string
  updated_at: string
}

export type Admin = {
  id: string
  email: string
  created_at: string
}

// Cart Types
export type Cart = {
  id: string
  user_id: string
  created_at: string
  updated_at: string
}

export type CartItem = {
  id: string
  cart_id: string
  product_id: string
  quantity: number
  size: string | null
  color: string | null
  created_at: string
  updated_at: string
  product?: Product
}

// Order Types
export type Order = {
  id: string
  order_number: string
  user_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string
  subtotal: number
  shipping_cost: number
  tax: number
  discount: number
  total: number
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  payment_status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method: string | null
  shipping_address_id: string | null
  tracking_number: string | null
  courier: string | null
  estimated_delivery: string | null
  customer_notes: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
}

export type OrderItem = {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_image_url: string | null
  product_sku: string | null
  quantity: number
  size: string | null
  color: string | null
  price: number
  subtotal: number
  created_at: string
}

// Shipping Types
export type ShippingAddress = {
  id: string
  user_id: string
  recipient_name: string
  phone: string
  address_line1: string
  address_line2: string | null
  city: string
  province: string
  postal_code: string
  country: string
  is_default: boolean
  label: string | null
  created_at: string
  updated_at: string
}

// Payment Types
export type Payment = {
  id: string
  order_id: string
  payment_method: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'success' | 'failed' | 'expired' | 'cancelled' | 'refunded'
  payment_gateway: string | null
  transaction_id: string | null
  payment_token: string | null
  payment_url: string | null
  payment_proof_url: string | null
  gateway_response: any
  created_at: string
  updated_at: string
  paid_at: string | null
  expired_at: string | null
}

// Wishlist Type
export type Wishlist = {
  id: string
  user_id: string
  product_id: string
  created_at: string
  product?: Product
}

// Review Type
export type ProductReview = {
  id: string
  product_id: string
  user_id: string | null
  order_id: string | null
  rating: number
  title: string | null
  comment: string | null
  images: string[] | null
  is_verified_purchase: boolean
  is_published: boolean
  created_at: string
  updated_at: string
}
