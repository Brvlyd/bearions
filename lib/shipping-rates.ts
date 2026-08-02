import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchBiteshipRates } from './biteship'
import { evaluatePromotions, type PromotionContext } from './promotions'
import {
  rateOptionKey,
  type Parcel,
  type ParcelItem,
  type RateDestination,
  type RateOption,
  type RateOrigin,
  type ShippingQuote,
  type ShippingQuoteResult,
} from './shipping-types'
import type { ShippingPromotion, ShippingSettings } from './supabase'

// The rate engine. One entry point — getShippingQuotes — used by both the
// checkout quote endpoint and order creation, so a customer can never be
// charged a price the server did not compute itself.
//
// Rates come from whichever provider site_settings names. 'biteship' calls the
// live aggregator and silently falls back to the CMS zone table on any failure,
// so the store keeps quoting even when the upstream is down.

const round2 = (value: number) => Math.round(value * 100) / 100

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  shipping_origin_label: 'Bearion Warehouse',
  shipping_origin_address: null,
  shipping_origin_city: 'Bandung',
  shipping_origin_province: 'Jawa Barat',
  shipping_origin_postal_code: '40111',
  shipping_origin_country_code: 'ID',
  shipping_origin_area_id: null,
  shipping_provider: 'zone',
  shipping_default_weight_grams: 500,
  shipping_volumetric_divisor: 6000,
  shipping_handling_fee: 0,
  shipping_international_enabled: true,
  shipping_customs_note:
    'Import duties and taxes are not included and are payable to the courier on delivery.',
  shipping_customs_note_id:
    'Bea masuk dan pajak impor belum termasuk dan dibayarkan ke kurir saat paket tiba.',
}

const SHIPPING_SETTINGS_COLUMNS = [
  'shipping_origin_label',
  'shipping_origin_address',
  'shipping_origin_city',
  'shipping_origin_province',
  'shipping_origin_postal_code',
  'shipping_origin_country_code',
  'shipping_origin_area_id',
  'shipping_provider',
  'shipping_default_weight_grams',
  'shipping_volumetric_divisor',
  'shipping_handling_fee',
  'shipping_international_enabled',
  'shipping_customs_note',
  'shipping_customs_note_id',
].join(', ')

/** Reads the singleton settings row, filling in defaults for a store not yet configured. */
export async function loadShippingSettings(
  client: SupabaseClient
): Promise<ShippingSettings> {
  const { data, error } = await client
    .from('site_settings')
    .select(SHIPPING_SETTINGS_COLUMNS)
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('Failed to load shipping settings:', error.message)
    return DEFAULT_SHIPPING_SETTINGS
  }

  const row = data as unknown as Partial<ShippingSettings>

  return {
    ...DEFAULT_SHIPPING_SETTINGS,
    ...row,
    shipping_provider: row.shipping_provider === 'biteship' ? 'biteship' : 'zone',
    shipping_default_weight_grams: Math.max(
      1,
      toNumber(row.shipping_default_weight_grams, DEFAULT_SHIPPING_SETTINGS.shipping_default_weight_grams)
    ),
    shipping_volumetric_divisor: Math.max(
      1,
      toNumber(row.shipping_volumetric_divisor, DEFAULT_SHIPPING_SETTINGS.shipping_volumetric_divisor)
    ),
    shipping_handling_fee: Math.max(0, toNumber(row.shipping_handling_fee, 0)),
    shipping_international_enabled: row.shipping_international_enabled !== false,
  }
}

// ---------------------------------------------------------------------------
// Parcel weight
// ---------------------------------------------------------------------------

/**
 * Couriers bill the larger of actual and volumetric weight, so a light but bulky
 * parcel is priced by the space it occupies. Ignoring this is the classic way to
 * quote Rp 20.000 and get invoiced Rp 70.000.
 */
export function calculateParcel(items: ParcelItem[], settings: ShippingSettings): Parcel {
  const fallbackWeight = settings.shipping_default_weight_grams
  const divisor = settings.shipping_volumetric_divisor

  let actual = 0
  let volumetric = 0
  let itemCount = 0

  for (const item of items) {
    const quantity = Math.max(0, Math.trunc(toNumber(item.quantity)))
    if (quantity === 0) continue

    itemCount += quantity

    const unitActual = Math.max(1, toNumber(item.weightGrams, fallbackWeight) || fallbackWeight)
    actual += unitActual * quantity

    const length = toNumber(item.lengthCm)
    const width = toNumber(item.widthCm)
    const height = toNumber(item.heightCm)

    // Without full dimensions there is nothing to compute, so the actual weight
    // stands in for this line.
    const unitVolumetric =
      length > 0 && width > 0 && height > 0
        ? ((length * width * height) / divisor) * 1000
        : unitActual

    volumetric += unitVolumetric * quantity
  }

  const weightGrams = Math.max(1, Math.round(Math.max(actual, volumetric)))

  return {
    weightGrams,
    actualWeightGrams: Math.round(actual),
    volumetricWeightGrams: Math.round(volumetric),
    billableKg: Math.max(1, Math.ceil(weightGrams / 1000)),
    itemCount,
  }
}

// ---------------------------------------------------------------------------
// Zone provider — always available, no API key
// ---------------------------------------------------------------------------

type ZoneRow = {
  id: string
  code: string
  kind: 'domestic' | 'international'
  province_names: string[] | null
  country_codes: string[] | null
  is_fallback: boolean
  sort_order: number
}

type ZoneRateRow = {
  zone_id: string
  courier_code: string
  courier_name: string
  service_code: string
  service_name: string
  first_kg_cost: number | string
  next_kg_cost: number | string
  etd_min_days: number
  etd_max_days: number
  sort_order: number
}

/** Province names vary ("DI Yogyakarta", "DAERAH ISTIMEWA YOGYAKARTA"); compare loosely. */
const normalizeProvince = (value: string) =>
  value
    .toUpperCase()
    .replace(/^PROVINSI\s+/, '')
    .replace(/[^A-Z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

function selectZone(zones: ZoneRow[], destination: RateDestination): ZoneRow | null {
  const isInternational = destination.countryCode.toUpperCase() !== 'ID'
  const kind = isInternational ? 'international' : 'domestic'
  const candidates = zones.filter((zone) => zone.kind === kind)

  const matched = isInternational
    ? candidates.find((zone) =>
        (zone.country_codes || []).includes(destination.countryCode.toUpperCase())
      )
    : candidates.find((zone) =>
        (zone.province_names || []).some(
          (name) => normalizeProvince(name) === normalizeProvince(destination.province || '')
        )
      )

  // An unmatched destination must never fall through to "free" — the fallback
  // zone carries the most conservative price for its kind.
  return matched || candidates.find((zone) => zone.is_fallback) || null
}

async function fetchZoneRates(
  client: SupabaseClient,
  destination: RateDestination,
  parcel: Parcel
): Promise<RateOption[]> {
  const { data: zoneData, error: zoneError } = await client
    .from('shipping_zones')
    .select('id, code, kind, province_names, country_codes, is_fallback, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (zoneError || !zoneData?.length) {
    if (zoneError) console.error('Failed to load shipping zones:', zoneError.message)
    return []
  }

  const zone = selectZone(zoneData as ZoneRow[], destination)
  if (!zone) return []

  const { data: rateData, error: rateError } = await client
    .from('shipping_zone_rates')
    .select(
      'zone_id, courier_code, courier_name, service_code, service_name, first_kg_cost, next_kg_cost, etd_min_days, etd_max_days, sort_order'
    )
    .eq('zone_id', zone.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (rateError || !rateData?.length) {
    if (rateError) console.error('Failed to load zone rates:', rateError.message)
    return []
  }

  const extraKg = Math.max(0, parcel.billableKg - 1)

  return (rateData as ZoneRateRow[]).map<RateOption>((rate) => ({
    provider: 'zone',
    courierCode: rate.courier_code,
    courierName: rate.courier_name,
    serviceCode: rate.service_code,
    serviceName: rate.service_name,
    baseCost: Math.round(toNumber(rate.first_kg_cost) + extraKg * toNumber(rate.next_kg_cost)),
    etdMinDays: rate.etd_min_days,
    etdMaxDays: rate.etd_max_days,
    zoneCode: zone.code,
  }))
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export const originFromSettings = (settings: ShippingSettings): RateOrigin => ({
  countryCode: (settings.shipping_origin_country_code || 'ID').toUpperCase(),
  province: settings.shipping_origin_province || '',
  city: settings.shipping_origin_city || '',
  postalCode: settings.shipping_origin_postal_code,
  areaId: settings.shipping_origin_area_id,
})

async function loadActivePromotions(client: SupabaseClient): Promise<ShippingPromotion[]> {
  const { data, error } = await client
    .from('shipping_promotions')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })

  if (error) {
    // A promotions outage must not block checkout — customers just pay full price.
    console.error('Failed to load promotions:', error.message)
    return []
  }

  return (data || []) as ShippingPromotion[]
}

export type QuoteInput = {
  destination: RateDestination
  items: ParcelItem[]
  /** Merchandise value in IDR, before shipping and tax. */
  subtotal: number
  settings?: ShippingSettings
  promotions?: ShippingPromotion[]
}

/**
 * Price every courier service available for this cart and destination, with
 * promotions already applied to each option.
 *
 * Promotions are evaluated per option because a rule can be courier-specific —
 * "free shipping on JNE REG" must not discount a DHL quote.
 */
export async function getShippingQuotes(
  client: SupabaseClient,
  input: QuoteInput
): Promise<ShippingQuoteResult> {
  const settings = input.settings ?? (await loadShippingSettings(client))
  const parcel = calculateParcel(input.items, settings)
  const destination = input.destination
  const isInternational = destination.countryCode.toUpperCase() !== 'ID'

  const customsNote = isInternational
    ? {
        en: settings.shipping_customs_note || DEFAULT_SHIPPING_SETTINGS.shipping_customs_note || '',
        id:
          settings.shipping_customs_note_id ||
          DEFAULT_SHIPPING_SETTINGS.shipping_customs_note_id ||
          '',
      }
    : null

  const empty: ShippingQuoteResult = {
    parcel,
    options: [],
    nearMisses: [],
    isInternational,
    customsNote,
    usedFallback: false,
  }

  if (isInternational && !settings.shipping_international_enabled) {
    return empty
  }

  let options: RateOption[] = []
  let usedFallback = false

  if (settings.shipping_provider === 'biteship') {
    const live = await fetchBiteshipRates({
      origin: originFromSettings(settings),
      destination,
      parcel,
      valueIdr: input.subtotal,
    })

    if (live?.length) {
      options = live
    } else {
      usedFallback = true
    }
  }

  if (options.length === 0) {
    options = await fetchZoneRates(client, destination, parcel)
  }

  if (options.length === 0) return { ...empty, usedFallback }

  const handlingFee = settings.shipping_handling_fee
  if (handlingFee > 0) {
    options = options.map((option) => ({
      ...option,
      baseCost: round2(option.baseCost + handlingFee),
    }))
  }

  const promotions = input.promotions ?? (await loadActivePromotions(client))

  const quotes: ShippingQuote[] = options.map((option) => {
    const context: PromotionContext = {
      itemCount: parcel.itemCount,
      subtotal: input.subtotal,
      weightGrams: parcel.weightGrams,
      shippingCost: option.baseCost,
      countryCode: destination.countryCode.toUpperCase(),
      courierCode: option.courierCode,
    }

    const outcome = evaluatePromotions(promotions, context)

    return {
      ...option,
      discount: outcome.shippingDiscount,
      finalCost: round2(Math.max(0, option.baseCost - outcome.shippingDiscount)),
      appliedPromotions: outcome.applied,
      orderDiscount: outcome.orderDiscount,
    }
  })

  quotes.sort((a, b) => a.finalCost - b.finalCost)

  // Near misses are cart-level, so the cheapest option is a fair basis for them.
  const cheapest = quotes[0]
  const nearMisses = evaluatePromotions(promotions, {
    itemCount: parcel.itemCount,
    subtotal: input.subtotal,
    weightGrams: parcel.weightGrams,
    shippingCost: cheapest.baseCost,
    countryCode: destination.countryCode.toUpperCase(),
    courierCode: cheapest.courierCode,
  }).nearMisses

  return { parcel, options: quotes, nearMisses, isInternational, customsNote, usedFallback }
}

/** Find the option a customer picked, or null when it is stale or was never offered. */
export const findQuote = (
  quotes: ShippingQuote[],
  courierCode: string,
  serviceCode: string
): ShippingQuote | null =>
  quotes.find(
    (quote) =>
      rateOptionKey(quote) ===
      `${(courierCode || '').toLowerCase()}:${(serviceCode || '').toLowerCase()}`
  ) || null
