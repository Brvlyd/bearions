import type { AppliedPromotion } from './supabase'
import type { NearMiss } from './promotions'

// Shared vocabulary for the rate engine. Kept free of Supabase and network
// imports so both the browser and the API routes can use these types.

export type RateProviderName = 'zone' | 'biteship'

/** One cart line reduced to what a courier needs to price it. */
export type ParcelItem = {
  quantity: number
  weightGrams: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
}

export type Parcel = {
  /** What the courier bills for: the larger of actual and volumetric weight. */
  weightGrams: number
  actualWeightGrams: number
  volumetricWeightGrams: number
  billableKg: number
  itemCount: number
}

export type RateDestination = {
  countryCode: string
  province: string
  city: string
  district: string | null
  postalCode: string | null
  areaId: string | null
}

export type RateOrigin = {
  countryCode: string
  province: string
  city: string
  postalCode: string | null
  areaId: string | null
}

/** A courier service and its undiscounted price. */
export type RateOption = {
  provider: RateProviderName
  courierCode: string
  courierName: string
  serviceCode: string
  serviceName: string
  baseCost: number
  etdMinDays: number
  etdMaxDays: number
  zoneCode: string | null
}

/** A rate option after promotions have been applied to it. */
export type ShippingQuote = RateOption & {
  discount: number
  finalCost: number
  appliedPromotions: AppliedPromotion[]
  /** Order-level (non-shipping) discount unlocked alongside this option. */
  orderDiscount: number
}

export type ShippingQuoteResult = {
  parcel: Parcel
  options: ShippingQuote[]
  /** Promotions the cart is close to unlocking, cheapest gap first. */
  nearMisses: NearMiss[]
  isInternational: boolean
  /** Duty/tax disclaimer to show on international checkouts. Null when domestic. */
  customsNote: { en: string; id: string } | null
  /** True when a live provider was configured but its call failed and we fell back. */
  usedFallback: boolean
}

/** Stable identifier for a courier service, used to match a customer's pick. */
export const rateOptionKey = (option: Pick<RateOption, 'courierCode' | 'serviceCode'>) =>
  `${option.courierCode}:${option.serviceCode}`
