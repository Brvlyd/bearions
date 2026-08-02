import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/api-auth'
import { loadOrdersAwaitingTracking, syncOrderTracking } from '@/lib/tracking'

// POST /api/shipping/sync-tracking
//
// Scheduled sweep over every parcel still in flight. Point a Supabase cron job
// or Vercel Cron at this once or twice a day: polling more often burns provider
// quota without telling customers anything new, since couriers themselves scan
// only a handful of times per parcel.
//
// Guarded by a shared secret rather than a user session, because no user is
// logged in when a scheduler calls it.

export async function POST(request: NextRequest) {
  const expected = process.env.SHIPPING_SYNC_SECRET

  if (!expected) {
    return NextResponse.json(
      { message: 'SHIPPING_SYNC_SECRET is not configured' },
      { status: 503 }
    )
  }

  const provided =
    request.headers.get('x-sync-secret') ||
    (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')

  if (provided !== expected) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceClient = getServiceClient()
    const orders = await loadOrdersAwaitingTracking(serviceClient)

    let inserted = 0
    let delivered = 0
    let checked = 0

    // Sequential on purpose: a burst of parallel calls is the fastest way to hit
    // an upstream rate limit, and this job is never latency-sensitive.
    for (const order of orders) {
      const result = await syncOrderTracking(serviceClient, order)
      if (result.fetched) checked += 1
      inserted += result.inserted
      if (result.delivered) delivered += 1
    }

    return NextResponse.json({ scanned: orders.length, checked, inserted, delivered })
  } catch (error) {
    console.error('Error in tracking sync job:', error)
    return NextResponse.json({ message: 'Tracking sync failed' }, { status: 500 })
  }
}
