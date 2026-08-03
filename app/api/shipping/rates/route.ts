import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, getServiceClient } from '@/lib/api-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import {
  computeSubtotal,
  loadCartLines,
  loadOwnedAddress,
  toDestination,
  toParcelItems,
} from '@/lib/shipping-cart'
import { getCartPromotions, getShippingQuotes } from '@/lib/shipping-rates'
import { rateOptionKey } from '@/lib/shipping-types'
import { SHIPPING_ENABLED } from '@/lib/store-config'

// POST /api/shipping/rates
//
// Live courier options for the caller's cart shipped to one of their addresses.
// Purely a read: it quotes, it never reserves or charges anything. The same
// engine runs again inside /api/orders/create, so a stale or tampered quote
// cannot influence the price actually charged.
//
// While SHIPPING_ENABLED is false it returns no courier options at all, only the
// merchandise-level promotions, so checkout can show the same total the order
// route will charge without ever mentioning ongkir.

export async function POST(request: NextRequest) {
  try {
    const caller = await authenticateRequest(request)

    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Quotes are cheap but hit an upstream courier API, so keep them bounded.
    const limit = checkRateLimit({
      key: `shipping-rates:${caller.userId}:${getClientIp(request)}`,
      limit: 60,
      windowMs: 5 * 60 * 1000,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        { message: 'Terlalu banyak permintaan ongkir. Coba lagi sebentar lagi.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const shippingAddressId =
      typeof body.shippingAddressId === 'string' ? body.shippingAddressId : ''

    if (!shippingAddressId) {
      return NextResponse.json({ message: 'Missing shippingAddressId' }, { status: 400 })
    }

    const serviceClient = getServiceClient()

    const address = await loadOwnedAddress(serviceClient, shippingAddressId, caller.userId)
    if (!address) {
      return NextResponse.json({ message: 'Shipping address not found' }, { status: 404 })
    }

    const lines = await loadCartLines(serviceClient, caller.userId)
    const priced = lines.filter((line) => line.product)

    if (priced.length === 0) {
      return NextResponse.json({ message: 'Cart is empty' }, { status: 400 })
    }

    const destination = toDestination(address)
    const parcelItems = toParcelItems(priced)
    const subtotal = computeSubtotal(priced)

    if (!SHIPPING_ENABLED) {
      const cartPromotions = await getCartPromotions(serviceClient, {
        destination,
        items: parcelItems,
        subtotal,
      })

      return NextResponse.json({
        options: [],
        parcel: cartPromotions.parcel,
        isInternational: destination.countryCode !== 'ID',
        customsNote: null,
        cartDiscount: cartPromotions.orderDiscount,
        cartPromotions: cartPromotions.applied,
        nearMisses: cartPromotions.nearMisses.map((miss) => ({
          promotionId: miss.promotion.id,
          conditionType: miss.promotion.condition_type,
          remaining: miss.remaining,
          rewardType: miss.promotion.reward_type,
          rewardValue: miss.promotion.reward_value,
          maxDiscount: miss.promotion.max_discount,
          conditionValue: miss.promotion.condition_value,
        })),
      })
    }

    const quote = await getShippingQuotes(serviceClient, {
      destination,
      items: parcelItems,
      subtotal,
    })

    if (quote.options.length === 0) {
      return NextResponse.json(
        {
          message: quote.isInternational
            ? 'Pengiriman internasional belum tersedia untuk tujuan ini.'
            : 'Tidak ada layanan pengiriman untuk alamat ini.',
          options: [],
          parcel: quote.parcel,
          isInternational: quote.isInternational,
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      parcel: quote.parcel,
      isInternational: quote.isInternational,
      customsNote: quote.customsNote,
      nearMisses: quote.nearMisses.map((miss) => ({
        promotionId: miss.promotion.id,
        conditionType: miss.promotion.condition_type,
        remaining: miss.remaining,
        rewardType: miss.promotion.reward_type,
        rewardValue: miss.promotion.reward_value,
        maxDiscount: miss.promotion.max_discount,
        conditionValue: miss.promotion.condition_value,
      })),
      options: quote.options.map((option) => ({
        key: rateOptionKey(option),
        courierCode: option.courierCode,
        courierName: option.courierName,
        serviceCode: option.serviceCode,
        serviceName: option.serviceName,
        baseCost: option.baseCost,
        discount: option.discount,
        finalCost: option.finalCost,
        etdMinDays: option.etdMinDays,
        etdMaxDays: option.etdMaxDays,
        appliedPromotions: option.appliedPromotions,
        orderDiscount: option.orderDiscount,
      })),
    })
  } catch (error) {
    console.error('Error in shipping rates API:', error)
    return NextResponse.json({ message: 'Failed to calculate shipping rates' }, { status: 500 })
  }
}
