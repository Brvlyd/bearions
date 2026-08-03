import type { Parcel, RateDestination, RateOption, RateOrigin } from './shipping-types'

// Live multi-courier rates and tracking from Biteship.
//
// Server-only: the API key must never reach the browser. Rate and tracking calls
// are best-effort — callers fall back to the CMS zone table when they return
// null, so a Biteship outage degrades the price rather than breaking checkout.

const BITESHIP_BASE_URL = 'https://api.biteship.com'
const REQUEST_TIMEOUT_MS = 8000

/**
 * Couriers we ask for, limited to what this account actually carries — asking
 * for one it does not have (DHL, for instance) just wastes a slot in the reply.
 * Biteship silently skips any courier that cannot serve the route.
 */
const DOMESTIC_COURIERS =
  'jne,jnt,sicepat,anteraja,pos,ninja,tiki,lion,idexpress,wahana,sap,rpx,paxel'

/** TLX is the only true international carrier on the account; POS adds EMS reach. */
const INTERNATIONAL_COURIERS = 'tlx,pos'

export const isBiteshipConfigured = () => Boolean(process.env.BITESHIP_API_KEY)

const apiKey = () => process.env.BITESHIP_API_KEY || ''

/**
 * Why a call did not produce data. Biteship answers 400 for both a bad key and
 * an empty balance, so the reason has to be read out of the body — and the
 * difference matters: one is a config error, the other is a billing one.
 */
export type BiteshipFailureReason =
  | 'unconfigured'
  | 'unauthorized'
  | 'insufficient_balance'
  | 'error'

export type BiteshipResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: BiteshipFailureReason; message: string }

const classifyError = (body: { error?: string; code?: number } | null): BiteshipFailureReason => {
  const message = (body?.error || '').toLowerCase()

  if (body?.code === 40000001 || message.includes('authentication')) return 'unauthorized'
  if (message.includes('balance')) return 'insufficient_balance'

  return 'error'
}

async function biteshipFetch<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown }
): Promise<BiteshipResult<T>> {
  if (!isBiteshipConfigured()) {
    return { ok: false, reason: 'unconfigured', message: 'BITESHIP_API_KEY is not set' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${BITESHIP_BASE_URL}${path}`, {
      method: init.method,
      headers: {
        authorization: apiKey(),
        'content-type': 'application/json',
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as
      | (T & { success?: boolean; error?: string; code?: number })
      | null

    // Biteship signals failure through `success: false` as often as through the
    // status code, so neither alone is enough to trust the body.
    if (!response.ok || payload?.success === false) {
      const reason = classifyError(payload)
      const message = payload?.error || `Biteship ${path} returned ${response.status}`
      console.error(`Biteship ${path} failed [${reason}]: ${message}`)
      return { ok: false, reason, message }
    }

    if (!payload) {
      return { ok: false, reason: 'error', message: `Biteship ${path} returned no body` }
    }

    return { ok: true, data: payload as T }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Biteship ${path} failed:`, message)
    return { ok: false, reason: 'error', message }
  } finally {
    clearTimeout(timeout)
  }
}

type BiteshipPricing = {
  courier_code?: string
  courier_name?: string
  courier_service_code?: string
  courier_service_name?: string
  price?: number
  shipment_duration_range?: string
  shipment_duration_unit?: string
  duration?: string
}

type BiteshipRatesResponse = {
  success?: boolean
  pricing?: BiteshipPricing[]
}

/**
 * Biteship reports lead time as a free-text range ("2 - 3", "1", "besok").
 * Anything unparseable falls back to a conservative window rather than
 * promising a delivery date we cannot support.
 */
const parseDuration = (pricing: BiteshipPricing): { min: number; max: number } => {
  const raw = pricing.shipment_duration_range || pricing.duration || ''
  const numbers = raw.match(/\d+/g)

  if (!numbers || numbers.length === 0) return { min: 2, max: 5 }

  const min = Number(numbers[0])
  const max = numbers.length > 1 ? Number(numbers[1]) : min

  // Hour-based services still need to be expressed in whole days downstream.
  if ((pricing.shipment_duration_unit || '').toLowerCase().startsWith('hour')) {
    return { min: 1, max: Math.max(1, Math.ceil(max / 24)) }
  }

  return { min: Math.max(1, min), max: Math.max(1, max) }
}

/**
 * Live rates for one parcel. Returns null when Biteship is unconfigured, errors,
 * or has nothing to offer for the route — all of which mean "use the zone table".
 */
export async function fetchBiteshipRates(params: {
  origin: RateOrigin
  destination: RateDestination
  parcel: Parcel
  valueIdr: number
}): Promise<RateOption[] | null> {
  const { origin, destination, parcel, valueIdr } = params

  // Biteship needs either an area id or a postcode at both ends.
  const hasOrigin = Boolean(origin.areaId || origin.postalCode)
  const hasDestination = Boolean(destination.areaId || destination.postalCode)
  if (!hasOrigin || !hasDestination) return null

  const isInternational = destination.countryCode.toUpperCase() !== 'ID'

  const body: Record<string, unknown> = {
    couriers: isInternational ? INTERNATIONAL_COURIERS : DOMESTIC_COURIERS,
    items: [
      {
        name: 'Order',
        description: 'Bearion order',
        value: Math.round(valueIdr),
        quantity: 1,
        weight: parcel.weightGrams,
      },
    ],
  }

  if (origin.areaId) body.origin_area_id = origin.areaId
  else body.origin_postal_code = origin.postalCode

  if (destination.areaId) body.destination_area_id = destination.areaId
  else body.destination_postal_code = destination.postalCode

  const result = await biteshipFetch<BiteshipRatesResponse>('/v1/rates/couriers', {
    method: 'POST',
    body,
  })

  if (!result.ok || !result.data.pricing?.length) return null

  const options = result.data.pricing
    .filter((pricing) => Number(pricing.price) > 0 && pricing.courier_code)
    .map<RateOption>((pricing) => {
      const duration = parseDuration(pricing)

      return {
        provider: 'biteship',
        courierCode: (pricing.courier_code || '').toLowerCase(),
        courierName: pricing.courier_name || (pricing.courier_code || '').toUpperCase(),
        serviceCode: (pricing.courier_service_code || 'standard').toLowerCase(),
        serviceName: pricing.courier_service_name || 'Standard',
        baseCost: Math.round(Number(pricing.price)),
        etdMinDays: duration.min,
        etdMaxDays: duration.max,
        zoneCode: null,
      }
    })

  return options.length > 0 ? options : null
}

// ---------------------------------------------------------------------------
// Area lookup
// ---------------------------------------------------------------------------

export type BiteshipArea = {
  id: string
  name: string
  province: string
  city: string
  district: string
  postalCode: string
}

type BiteshipAreaRow = {
  id?: string
  name?: string
  administrative_division_level_1_name?: string
  administrative_division_level_2_name?: string
  administrative_division_level_3_name?: string
  postal_code?: number | string
}

type BiteshipAreasResponse = {
  success?: boolean
  areas?: BiteshipAreaRow[]
}

/**
 * Resolve free-text ("coblong bandung", "40131") to Biteship area IDs.
 *
 * An area ID prices to the district, where a bare postcode only gets the courier
 * to the city — the gap between the two is exactly the kind of quote that gets
 * undercharged. Unlike rates and tracking this endpoint costs nothing to call,
 * so it works even on an account with no balance.
 */
export async function searchBiteshipAreas(
  query: string,
  countryCode = 'ID'
): Promise<BiteshipArea[] | null> {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []

  const params = new URLSearchParams({
    countries: countryCode.toLowerCase(),
    input: trimmed,
    type: 'single',
  })

  const result = await biteshipFetch<BiteshipAreasResponse>(`/v1/maps/areas?${params}`, {
    method: 'GET',
  })

  if (!result.ok) return null

  return (result.data.areas || [])
    .filter((area) => area.id)
    .map<BiteshipArea>((area) => ({
      id: area.id as string,
      name: area.name || '',
      province: area.administrative_division_level_1_name || '',
      city: area.administrative_division_level_2_name || '',
      district: area.administrative_division_level_3_name || '',
      postalCode: area.postal_code ? String(area.postal_code) : '',
    }))
}

// ---------------------------------------------------------------------------
// Account status
// ---------------------------------------------------------------------------

export type BiteshipStatus = {
  configured: boolean
  /** Key accepted and the paid endpoints answer. */
  healthy: boolean
  reason: BiteshipFailureReason | null
  message: string
  /** Distinct courier codes the account can book. */
  courierCount: number
}

type BiteshipCouriersResponse = {
  success?: boolean
  couriers?: { courier_code?: string }[]
}

/**
 * Probe the account for the admin panel: is the key valid, and can it actually
 * quote? The courier list is free while rates are billed, so a two-step check is
 * the only way to tell a broken key from an empty wallet.
 */
export async function checkBiteshipStatus(): Promise<BiteshipStatus> {
  if (!isBiteshipConfigured()) {
    return {
      configured: false,
      healthy: false,
      reason: 'unconfigured',
      message: 'BITESHIP_API_KEY is not set',
      courierCount: 0,
    }
  }

  const couriers = await biteshipFetch<BiteshipCouriersResponse>('/v1/couriers', { method: 'GET' })

  if (!couriers.ok) {
    return {
      configured: true,
      healthy: false,
      reason: couriers.reason,
      message: couriers.message,
      courierCount: 0,
    }
  }

  const courierCount = new Set(
    (couriers.data.couriers || []).map((courier) => courier.courier_code).filter(Boolean)
  ).size

  // A throwaway quote is the only honest test of whether billing is live.
  const probe = await biteshipFetch<BiteshipRatesResponse>('/v1/rates/couriers', {
    method: 'POST',
    body: {
      origin_postal_code: 40111,
      destination_postal_code: 12190,
      couriers: 'jne',
      items: [{ name: 'Probe', value: 10000, quantity: 1, weight: 1000 }],
    },
  })

  if (!probe.ok) {
    return {
      configured: true,
      healthy: false,
      reason: probe.reason,
      message: probe.message,
      courierCount,
    }
  }

  return {
    configured: true,
    healthy: true,
    reason: null,
    message: 'Biteship is reachable and billing is active',
    courierCount,
  }
}

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

export type CourierScan = {
  status: string
  description: string
  location: string | null
  eventTime: string
}

type BiteshipTrackingHistory = {
  note?: string
  status?: string
  updated_at?: string
  service_type?: string
}

type BiteshipTrackingResponse = {
  success?: boolean
  status?: string
  history?: BiteshipTrackingHistory[]
}

/**
 * Scans for one waybill. Null means "no update available" — never an empty list,
 * so the caller can tell a failed lookup from a parcel with no movement yet.
 */
export async function fetchBiteshipTracking(
  waybillId: string,
  courierCode: string
): Promise<CourierScan[] | null> {
  if (!waybillId || !courierCode) return null

  const path = `/v1/trackings/${encodeURIComponent(waybillId)}/couriers/${encodeURIComponent(
    courierCode.toLowerCase()
  )}`

  const result = await biteshipFetch<BiteshipTrackingResponse>(path, { method: 'GET' })

  if (!result.ok || !result.data.history?.length) return null

  return result.data.history
    .filter((entry) => entry.updated_at)
    .map<CourierScan>((entry) => ({
      status: entry.status || 'in_transit',
      description: entry.note || entry.status || 'Courier update',
      location: entry.service_type || null,
      eventTime: new Date(entry.updated_at as string).toISOString(),
    }))
}
