import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/api-auth'
import { syncOrderTracking } from '@/lib/tracking'

// POST /api/webhooks/biteship
//
// Push counterpart to the polling job: Biteship calls this the moment a parcel
// is scanned, so the customer's timeline moves in near real time instead of
// waiting for the next cron tick.
//
// The payload is only used to identify which order changed — the scans
// themselves are re-read from the API. That way a spoofed body can at worst
// trigger an extra lookup, never write a fake delivery event.

export async function POST(request: NextRequest) {
  const expected = process.env.BITESHIP_WEBHOOK_SECRET

  if (!expected) {
    return NextResponse.json({ message: 'Webhook is not configured' }, { status: 503 })
  }

  const provided =
    request.headers.get('x-biteship-signature') ||
    request.headers.get('x-webhook-token') ||
    ''

  if (provided !== expected) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))

    const waybill =
      (typeof body.courier_waybill_id === 'string' && body.courier_waybill_id) ||
      (typeof body.waybill_id === 'string' && body.waybill_id) ||
      ''

    const orderReference =
      (typeof body.order_reference_id === 'string' && body.order_reference_id) || ''

    if (!waybill && !orderReference) {
      return NextResponse.json({ message: 'No order reference in payload' }, { status: 400 })
    }

    const serviceClient = getServiceClient()

    const query = serviceClient
      .from('orders')
      .select('id, status, tracking_number, shipping_courier_code, courier')

    const { data: order } = await (
      waybill ? query.eq('tracking_number', waybill) : query.eq('order_number', orderReference)
    ).maybeSingle()

    if (!order) {
      // Acknowledge anyway: retrying an event for an order we don't have will
      // never succeed, and a 4xx makes the provider queue it forever.
      return NextResponse.json({ message: 'Order not found, ignored' }, { status: 200 })
    }

    const result = await syncOrderTracking(serviceClient, order)

    return NextResponse.json({ ok: true, inserted: result.inserted, delivered: result.delivered })
  } catch (error) {
    console.error('Error in Biteship webhook:', error)
    return NextResponse.json({ message: 'Webhook processing failed' }, { status: 500 })
  }
}
