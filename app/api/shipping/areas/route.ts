import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { isBiteshipConfigured, searchBiteshipAreas } from '@/lib/biteship'

// GET /api/shipping/areas?q=...&country=ID
//
// Turns what someone types into Biteship area IDs. An area ID prices to the
// district while a bare postcode only reaches the city, so storing one on an
// address is what makes a quote match the courier's eventual invoice.
//
// Authenticated because it proxies a keyed upstream — not because the data is
// sensitive. Any signed-in customer needs it to save an address.

export async function GET(request: NextRequest) {
  try {
    const caller = await authenticateRequest(request)

    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Typeahead fires per keystroke, so this ceiling is higher than the quote one.
    const limit = checkRateLimit({
      key: `shipping-areas:${caller.userId}:${getClientIp(request)}`,
      limit: 120,
      windowMs: 5 * 60 * 1000,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        { message: 'Terlalu banyak pencarian alamat. Coba lagi sebentar lagi.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    if (!isBiteshipConfigured()) {
      return NextResponse.json({ areas: [], configured: false })
    }

    const query = (request.nextUrl.searchParams.get('q') || '').trim()
    const country = (request.nextUrl.searchParams.get('country') || 'ID').trim()

    if (query.length < 3) {
      return NextResponse.json({ areas: [], configured: true })
    }

    const areas = await searchBiteshipAreas(query, country)

    if (areas === null) {
      return NextResponse.json(
        { message: 'Pencarian alamat sedang tidak tersedia.', areas: [], configured: true },
        { status: 200 }
      )
    }

    return NextResponse.json({ areas: areas.slice(0, 20), configured: true })
  } catch (error) {
    console.error('Error in shipping areas API:', error)
    return NextResponse.json({ message: 'Failed to search areas' }, { status: 500 })
  }
}
