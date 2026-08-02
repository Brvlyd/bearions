import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, getServiceClient, isAdminUser } from '@/lib/api-auth'
import { syncOrderTracking } from '@/lib/tracking'

// GET /api/orders/[orderNumber]/tracking
//
// The timeline for one order, refreshed from the courier on the way past when
// the stored data has gone stale. Opening the page is therefore enough to see
// the latest scan — no admin action, no manual refresh button.

type RouteContext = {
  params: Promise<{ orderNumber: string }>
}

/** Don't call the courier more than once every few minutes per order. */
const SYNC_STALE_MS = 15 * 60 * 1000

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { orderNumber } = await context.params

    const caller = await authenticateRequest(request)
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = getServiceClient()

    const { data: order } = await serviceClient
      .from('orders')
      .select(
        'id, user_id, status, tracking_number, courier, shipping_courier_code, shipping_etd_min_days, shipping_etd_max_days, shipped_at, delivered_at'
      )
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    const owns = order.user_id && order.user_id === caller.userId
    if (!owns && !(await isAdminUser(caller))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // Refresh only when there is a waybill in flight and we haven't looked recently.
    if (order.tracking_number && order.status !== 'delivered') {
      const { data: latest } = await serviceClient
        .from('order_tracking_events')
        .select('created_at')
        .eq('order_id', order.id)
        .eq('source', 'courier')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const lastChecked = latest?.created_at ? new Date(latest.created_at).getTime() : 0

      if (Date.now() - lastChecked > SYNC_STALE_MS) {
        // Best-effort: a courier outage should still render the system timeline.
        await syncOrderTracking(serviceClient, order).catch((error) =>
          console.error('Tracking sync failed:', error)
        )
      }
    }

    const { data: events, error } = await serviceClient
      .from('order_tracking_events')
      .select('id, source, status, description, description_id, location, event_time')
      .eq('order_id', order.id)
      .order('event_time', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      events: events || [],
      courier: order.courier,
      trackingNumber: order.tracking_number,
      status: order.status,
      etdMinDays: order.shipping_etd_min_days,
      etdMaxDays: order.shipping_etd_max_days,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at,
    })
  } catch (error) {
    console.error('Error in order tracking API:', error)
    return NextResponse.json({ message: 'Failed to load tracking' }, { status: 500 })
  }
}
