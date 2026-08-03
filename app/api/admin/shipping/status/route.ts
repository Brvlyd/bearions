import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, isAdminUser } from '@/lib/api-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { checkBiteshipStatus } from '@/lib/biteship'

// GET /api/admin/shipping/status
//
// Powers the connection panel on Admin -> Pengiriman. It exists so the shop
// owner can tell "the key is wrong" from "the balance ran out" without reading
// server logs — the two failures look identical from the storefront, where both
// just fall back to the zone table.

export async function GET(request: NextRequest) {
  try {
    const caller = await authenticateRequest(request)

    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (!(await isAdminUser(caller))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // The probe spends a rate-API call, so don't let a refresh button drain quota.
    const limit = checkRateLimit({
      key: `shipping-status:${caller.userId}:${getClientIp(request)}`,
      limit: 20,
      windowMs: 5 * 60 * 1000,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        { message: 'Terlalu sering mengecek. Tunggu sebentar lalu coba lagi.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    return NextResponse.json(await checkBiteshipStatus())
  } catch (error) {
    console.error('Error in Biteship status API:', error)
    return NextResponse.json({ message: 'Failed to check Biteship status' }, { status: 500 })
  }
}
