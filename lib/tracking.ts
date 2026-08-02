import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchBiteshipTracking, isBiteshipConfigured, type CourierScan } from './biteship'

// Tracking is written by machines, never typed in by hand.
//
// Two sources feed one timeline:
//   * 'system' events come from a database trigger on `orders`, so placing,
//     paying for, or shipping an order records itself.
//   * 'courier' events are real scans pulled from the aggregator here.
//
// Both land in order_tracking_events with a dedupe_key, so polling the same
// waybill repeatedly is idempotent.

export type TrackableOrder = {
  id: string
  status: string
  tracking_number: string | null
  shipping_courier_code: string | null
  courier: string | null
}

/** Courier vocabularies vary; collapse them to the few states the UI renders. */
const normalizeStatus = (raw: string): string => {
  const value = (raw || '').toLowerCase()

  if (/deliver|received|diterima|terkirim/.test(value)) return 'delivered'
  if (/out.?for.?deliver|dikirim ke alamat|courier.?dispatch/.test(value)) return 'out_for_delivery'
  if (/pick|dijemput|collected/.test(value)) return 'picked_up'
  if (/transit|proses|manifest|departed|arrived/.test(value)) return 'in_transit'
  if (/return|retur/.test(value)) return 'returned'
  if (/fail|gagal|exception|problem/.test(value)) return 'exception'

  return 'in_transit'
}

/**
 * Scans are keyed by timestamp plus status. Couriers do reissue the same event
 * with a nudged timestamp, which produces a near-duplicate row rather than a
 * lost one — the safer failure of the two.
 */
const dedupeKeyFor = (scan: CourierScan, normalized: string) =>
  `courier:${normalized}:${scan.eventTime}`

export type SyncResult = {
  inserted: number
  delivered: boolean
  /** False when no provider is configured or the lookup returned nothing. */
  fetched: boolean
}

/**
 * Pull the latest scans for one order and append anything new.
 *
 * Marks the order delivered when the courier says so, which is the whole point:
 * nobody has to sit in the admin panel flipping statuses. Requires a client with
 * write access to orders (the service client).
 */
export async function syncOrderTracking(
  client: SupabaseClient,
  order: TrackableOrder
): Promise<SyncResult> {
  const idle: SyncResult = { inserted: 0, delivered: false, fetched: false }

  if (!order.tracking_number) return idle
  if (!isBiteshipConfigured()) return idle

  // Fall back to the first word of the display name ("JNE Reguler" -> "jne")
  // for orders created before the courier code column existed.
  const courierCode =
    order.shipping_courier_code || (order.courier || '').split(/\s+/)[0]?.toLowerCase() || ''

  if (!courierCode) return idle

  const scans = await fetchBiteshipTracking(order.tracking_number, courierCode)
  if (!scans?.length) return idle

  const rows = scans.map((scan) => {
    const normalized = normalizeStatus(scan.status)

    return {
      order_id: order.id,
      source: 'courier' as const,
      status: normalized,
      description: scan.description,
      description_id: scan.description,
      location: scan.location,
      event_time: scan.eventTime,
      dedupe_key: dedupeKeyFor(scan, normalized),
    }
  })

  const { data: insertedRows, error } = await client
    .from('order_tracking_events')
    .upsert(rows, { onConflict: 'order_id,dedupe_key', ignoreDuplicates: true })
    .select('id')

  if (error) {
    console.error(`Failed to store tracking for order ${order.id}:`, error.message)
    return { ...idle, fetched: true }
  }

  const delivered = rows.some((row) => row.status === 'delivered')

  if (delivered && order.status !== 'delivered') {
    const { error: statusError } = await client
      .from('orders')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', order.id)

    if (statusError) {
      console.error(`Failed to mark order ${order.id} delivered:`, statusError.message)
    }
  }

  return { inserted: insertedRows?.length || 0, delivered, fetched: true }
}

/**
 * Orders worth polling: shipped, with a waybill, not yet delivered. Bounded so a
 * scheduled run cannot fan out into hundreds of upstream calls.
 */
export async function loadOrdersAwaitingTracking(
  client: SupabaseClient,
  batchSize = 40
): Promise<TrackableOrder[]> {
  const { data, error } = await client
    .from('orders')
    .select('id, status, tracking_number, shipping_courier_code, courier')
    .not('tracking_number', 'is', null)
    .in('status', ['shipped', 'processing'])
    .order('updated_at', { ascending: true })
    .limit(batchSize)

  if (error) {
    console.error('Failed to load orders awaiting tracking:', error.message)
    return []
  }

  return (data || []) as TrackableOrder[]
}
