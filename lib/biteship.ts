import type { Parcel, RateDestination, RateOption, RateOrigin } from './shipping-types'

// Live multi-courier rates and tracking from Biteship.
//
// Server-only: the API key must never reach the browser. Every function here is
// best-effort — callers fall back to the CMS zone table when this returns null,
// so a Biteship outage degrades the price rather than breaking checkout.

const BITESHIP_BASE_URL = 'https://api.biteship.com'
const REQUEST_TIMEOUT_MS = 8000

/** Couriers we ask for. Biteship silently skips any the account cannot use. */
const DOMESTIC_COURIERS = 'jne,jnt,sicepat,anteraja,pos,ninja,tiki'
const INTERNATIONAL_COURIERS = 'pos,dhl,jne'

export const isBiteshipConfigured = () => Boolean(process.env.BITESHIP_API_KEY)

const apiKey = () => process.env.BITESHIP_API_KEY || ''

async function biteshipFetch<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown }
): Promise<T | null> {
  if (!isBiteshipConfigured()) return null

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

    if (!response.ok) {
      console.error(`Biteship ${path} returned ${response.status}`)
      return null
    }

    return (await response.json()) as T
  } catch (error) {
    console.error(`Biteship ${path} failed:`, error)
    return null
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

  const data = await biteshipFetch<BiteshipRatesResponse>('/v1/rates/couriers', {
    method: 'POST',
    body,
  })

  if (!data?.pricing?.length) return null

  const options = data.pricing
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

  const data = await biteshipFetch<BiteshipTrackingResponse>(path, { method: 'GET' })

  if (!data?.history?.length) return null

  return data.history
    .filter((entry) => entry.updated_at)
    .map<CourierScan>((entry) => ({
      status: entry.status || 'in_transit',
      description: entry.note || entry.status || 'Courier update',
      location: entry.service_type || null,
      eventTime: new Date(entry.updated_at as string).toISOString(),
    }))
}
