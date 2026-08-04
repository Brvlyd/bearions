import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iktbpmqahpkboovgbbib.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_U1bLx1ViEflYjYCCaEJR6w_yTqsN-PK'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'bearion-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type Product = {
  id: string
  name: string
  name_id?: string | null
  description: string | null
  description_id?: string | null
  price: number
  /** Discounted IDR price. When set, the original `price` is shown as crossed out. */
  sale_price?: number | null
  /** Manual USD price from the CMS. Null keeps the product priced in IDR only. */
  price_usd?: number | null
  stock: number
  category: string
  image_url: string | null
  /** Shipping weight. Null falls back to the store-wide default in site settings. */
  weight_grams?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  /** Harmonised System code for the customs form on international parcels. */
  hs_code?: string | null
  origin_country?: string | null
  created_at: string
  updated_at: string
}

export type Admin = {
  id: string
  email: string
  created_at: string
}

// Landing Page Types
export type LandingPageImage = {
  id: string
  position: number
  image_url: string
  created_at: string
  updated_at: string
}

export type CommunityPost = {
  id: string
  image_url: string
  caption: string | null
  created_by: string | null
  layout_size?: 's' | 'm' | 'w' | 'l' | null
  layout_order?: number | null
  created_at: string
  updated_at: string
}

export type AboutUsContentBlock = {
  id: string
  type: 'text' | 'image'
  text?: string
  image_url?: string
}

export type AboutUsContent = {
  id: number
  title: string
  headline: string
  content_blocks: AboutUsContentBlock[] | null
  background_image_url: string | null
  updated_at: string
  updated_by: string | null
}

// Global site settings (browser tab title + favicon + navbar logo)
export type SiteSettings = {
  id: number
  site_title: string
  site_description: string
  favicon_url: string | null
  logo_url: string | null
  /** Public-facing store info, shown on /contact and in LocalBusiness structured data. */
  contact_address: string | null
  contact_phone: string | null
  contact_email: string | null
  updated_at: string
  updated_by: string | null
}

/** Where Bearion ships from and how rates are priced. Lives on the same singleton row. */
export type ShippingSettings = {
  shipping_origin_label: string | null
  shipping_origin_address: string | null
  shipping_origin_city: string | null
  shipping_origin_province: string | null
  shipping_origin_postal_code: string | null
  shipping_origin_country_code: string | null
  shipping_origin_area_id: string | null
  /** Sender identity Biteship requires to book a shipment (not needed for quoting). */
  shipping_origin_contact_name: string | null
  shipping_origin_contact_phone: string | null
  shipping_origin_collection_method: 'pickup' | 'drop_off'
  /** 'zone' prices from the CMS rate table; 'biteship' calls the live aggregator. */
  shipping_provider: 'zone' | 'biteship'
  shipping_default_weight_grams: number
  shipping_volumetric_divisor: number
  shipping_handling_fee: number
  shipping_international_enabled: boolean
  shipping_customs_note: string | null
  shipping_customs_note_id: string | null
}

export type PaymentMethodConfig = {
  id: string
  code: string
  display_name: string
  description: string | null
  instructions: string | null
  provider_name: string | null
  account_name: string | null
  account_number: string | null
  requires_proof: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
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

  // Rate snapshot. shipping_cost is what was charged; shipping_base_cost is the
  // courier price before promotions, so the discount stays auditable.
  shipping_courier_code?: string | null
  shipping_service_code?: string | null
  shipping_service_name?: string | null
  shipping_base_cost?: number | null
  shipping_discount?: number | null
  shipping_etd_min_days?: number | null
  shipping_etd_max_days?: number | null
  shipping_weight_grams?: number | null
  shipping_zone_code?: string | null
  shipping_provider?: string | null
  applied_promotions?: AppliedPromotion[] | null
  fx_rate_idr_usd?: number | null

  // Biteship shipment booking. Presence of biteship_order_id means a real
  // shipment has been created — tracking_number holds the waybill_id.
  biteship_order_id?: string | null
  biteship_status?: string | null
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
  /** Null is legitimate: Hong Kong, the UAE and parts of Ireland have no postcode. */
  postal_code: string | null
  country: string
  /** ISO 3166-1 alpha-2. Decides whether the order is rated domestic or international. */
  country_code: string
  district: string | null
  subdistrict: string | null
  area_id: string | null
  is_default: boolean
  label: string | null
  created_at: string
  updated_at: string
}

// Shipping rate configuration owned by the CMS
export type ShippingZone = {
  id: string
  code: string
  name: string
  name_id: string | null
  kind: 'domestic' | 'international'
  province_names: string[] | null
  country_codes: string[] | null
  is_fallback: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type ShippingZoneRate = {
  id: string
  zone_id: string
  courier_code: string
  courier_name: string
  service_code: string
  service_name: string
  first_kg_cost: number
  next_kg_cost: number
  etd_min_days: number
  etd_max_days: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Promotions
export type PromotionRewardType =
  | 'free_shipping'
  | 'shipping_percent'
  | 'shipping_fixed'
  | 'order_percent'
  | 'order_fixed'

export type PromotionConditionType = 'always' | 'min_items' | 'min_subtotal' | 'min_weight'

export type PromotionScope = 'all' | 'domestic' | 'international'

export type ShippingPromotion = {
  id: string
  name: string
  name_id: string | null
  description: string | null
  description_id: string | null
  reward_type: PromotionRewardType
  reward_value: number
  max_discount: number | null
  condition_type: PromotionConditionType
  condition_value: number
  scope: PromotionScope
  country_codes: string[] | null
  courier_codes: string[] | null
  stackable: boolean
  priority: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  usage_limit: number | null
  usage_count: number
  created_at: string
  updated_at: string
}

/** What actually fired on one order, snapshotted so later CMS edits cannot rewrite it. */
export type AppliedPromotion = {
  id: string
  name: string
  name_id: string | null
  reward_type: PromotionRewardType
  shipping_discount: number
  order_discount: number
}

// Tracking
export type OrderTrackingEvent = {
  id: string
  order_id: string
  source: 'system' | 'courier'
  status: string
  description: string | null
  description_id: string | null
  location: string | null
  event_time: string
  dedupe_key: string
  created_at: string
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
  gateway_response: unknown
  proof_verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected'
  proof_verified_by?: string | null
  proof_verified_at?: string | null
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
