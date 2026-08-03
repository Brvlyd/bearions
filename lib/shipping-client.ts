import { supabase } from './supabase'
import type { AppliedPromotion, OrderTrackingEvent, PromotionConditionType, PromotionRewardType } from './supabase'

// Browser-side access to the shipping engine. Everything here is a thin fetch
// wrapper: no prices are computed in the browser, because the server recomputes
// them at order time and would reject a mismatch anyway.

export type ShippingRateOption = {
  key: string
  courierCode: string
  courierName: string
  serviceCode: string
  serviceName: string
  /** Courier price before promotions — shown struck through when discounted. */
  baseCost: number
  discount: number
  finalCost: number
  etdMinDays: number
  etdMaxDays: number
  appliedPromotions: AppliedPromotion[]
  orderDiscount: number
}

export type ShippingNearMiss = {
  promotionId: string
  conditionType: PromotionConditionType
  conditionValue: number
  remaining: number
  rewardType: PromotionRewardType
  rewardValue: number
  maxDiscount: number | null
}

export type ShippingRatesResponse = {
  options: ShippingRateOption[]
  parcel: {
    weightGrams: number
    actualWeightGrams: number
    volumetricWeightGrams: number
    billableKg: number
    itemCount: number
  }
  nearMisses: ShippingNearMiss[]
  isInternational: boolean
  customsNote: { en: string; id: string } | null
  /**
   * Merchandise-level discount that applies with no courier involved. Only
   * populated while shipping is hidden; otherwise it rides on the chosen option.
   */
  cartDiscount: number
  cartPromotions: AppliedPromotion[]
  message?: string
}

const authHeaders = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token

  if (!accessToken) throw new Error('NOT_AUTHENTICATED')

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }
}

/** Courier options for the signed-in user's cart to one of their saved addresses. */
export async function fetchShippingRates(
  shippingAddressId: string
): Promise<ShippingRatesResponse> {
  const response = await fetch('/api/shipping/rates', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ shippingAddressId }),
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(result.message || 'Failed to load shipping rates')
  }

  return {
    options: result.options || [],
    parcel: result.parcel,
    nearMisses: result.nearMisses || [],
    isInternational: Boolean(result.isInternational),
    customsNote: result.customsNote || null,
    cartDiscount: Number(result.cartDiscount) || 0,
    cartPromotions: result.cartPromotions || [],
    message: result.message,
  }
}

export type OrderTracking = {
  events: Pick<
    OrderTrackingEvent,
    'id' | 'source' | 'status' | 'description' | 'description_id' | 'location' | 'event_time'
  >[]
  courier: string | null
  trackingNumber: string | null
  status: string
  etdMinDays: number | null
  etdMaxDays: number | null
  shippedAt: string | null
  deliveredAt: string | null
}

/** The order's timeline. The endpoint refreshes it from the courier when stale. */
export async function fetchOrderTracking(orderNumber: string): Promise<OrderTracking> {
  const response = await fetch(
    `/api/orders/${encodeURIComponent(orderNumber)}/tracking`,
    { headers: await authHeaders() }
  )

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(result.message || 'Failed to load tracking')
  }

  return {
    events: result.events || [],
    courier: result.courier ?? null,
    trackingNumber: result.trackingNumber ?? null,
    status: result.status || 'pending',
    etdMinDays: result.etdMinDays ?? null,
    etdMaxDays: result.etdMaxDays ?? null,
    shippedAt: result.shippedAt ?? null,
    deliveredAt: result.deliveredAt ?? null,
  }
}

/** Plain-language label for a timeline entry, matching the trigger's vocabulary. */
export function trackingStatusLabel(status: string, language: 'en' | 'id'): string {
  const labels: Record<string, [string, string]> = {
    order_placed: ['Order placed', 'Pesanan dibuat'],
    payment_confirmed: ['Payment confirmed', 'Pembayaran dikonfirmasi'],
    status_confirmed: ['Order confirmed', 'Pesanan dikonfirmasi'],
    status_processing: ['Packing', 'Sedang dikemas'],
    status_shipped: ['Handed to courier', 'Diserahkan ke kurir'],
    status_delivered: ['Delivered', 'Paket diterima'],
    status_cancelled: ['Cancelled', 'Dibatalkan'],
    status_refunded: ['Refunded', 'Dana dikembalikan'],
    awb_assigned: ['Tracking number issued', 'Nomor resi terbit'],
    picked_up: ['Picked up', 'Paket dijemput'],
    in_transit: ['In transit', 'Dalam perjalanan'],
    out_for_delivery: ['Out for delivery', 'Sedang diantar'],
    delivered: ['Delivered', 'Paket diterima'],
    returned: ['Returned to sender', 'Dikembalikan ke pengirim'],
    exception: ['Delivery issue', 'Kendala pengiriman'],
  }

  const entry = labels[status]
  if (entry) return language === 'en' ? entry[0] : entry[1]

  return status.replace(/^status_/, '').replace(/_/g, ' ')
}
