import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, getServiceClient } from '@/lib/api-auth'
import { getIdrPerUsdRate } from '@/lib/paypal'
import { getEffectiveIdrPrice } from '@/lib/price'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import {
  computeSubtotal,
  loadCartLines,
  loadOwnedAddress,
  toDestination,
  toParcelItems,
} from '@/lib/shipping-cart'
import { findQuote, getShippingQuotes } from '@/lib/shipping-rates'

// POST /api/orders/create
//
// Orders used to be assembled in the browser: the client sent each item's price
// and the derived total straight into an INSERT. Anyone could therefore order
// any product for Rp 1 by editing the request, and PayPal would happily charge
// that total because the gateway route reads it back from the database.
//
// Here the client sends no money at all — only which address, which courier
// service and which payment method to use. Items come from the caller's own
// cart, every price is read from the products table, and shipping is re-quoted
// server-side, so the total is server-authoritative. A tampered courier choice
// fails to match a real quote and is rejected rather than trusted.

const TAX_RATE = 0.11

const round2 = (value: number) => Math.round(value * 100) / 100

export async function POST(request: NextRequest) {
  try {
    const caller = await authenticateRequest(request)

    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const limit = checkRateLimit({
      key: `create-order:${caller.userId}:${getClientIp(request)}`,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        { message: 'Terlalu banyak percobaan checkout. Coba lagi sebentar lagi.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const shippingAddressId = typeof body.shippingAddressId === 'string' ? body.shippingAddressId : ''
    const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod.trim() : ''
    const courierCode = typeof body.courierCode === 'string' ? body.courierCode.trim() : ''
    const serviceCode = typeof body.serviceCode === 'string' ? body.serviceCode.trim() : ''
    const customerNotes =
      typeof body.customerNotes === 'string' ? body.customerNotes.trim().slice(0, 1000) : ''

    if (!shippingAddressId || !paymentMethod) {
      return NextResponse.json(
        { message: 'Missing shippingAddressId or paymentMethod' },
        { status: 400 }
      )
    }

    const serviceClient = getServiceClient()

    // The address must belong to the caller — it supplies the recipient name,
    // phone and destination that end up on the order.
    const address = await loadOwnedAddress(serviceClient, shippingAddressId, caller.userId)

    if (!address) {
      return NextResponse.json({ message: 'Shipping address not found' }, { status: 404 })
    }

    const { data: method } = await serviceClient
      .from('payment_methods')
      .select('code, requires_proof, is_active')
      .eq('code', paymentMethod)
      .maybeSingle()

    if (!method || method.is_active === false) {
      return NextResponse.json({ message: 'Payment method is not available' }, { status: 400 })
    }

    const cartLines = await loadCartLines(serviceClient, caller.userId)

    if (cartLines.length === 0) {
      return NextResponse.json({ message: 'Cart is empty' }, { status: 400 })
    }

    const missingProduct = cartLines.find((line) => !line.product)
    if (missingProduct) {
      return NextResponse.json(
        { message: 'A product in your cart is no longer available' },
        { status: 409 }
      )
    }

    const outOfStock = cartLines.find(
      (line) => line.quantity < 1 || line.quantity > Number(line.product!.stock)
    )

    if (outOfStock) {
      return NextResponse.json(
        {
          message: `Stok tidak mencukupi untuk ${outOfStock.product!.name}`,
          productId: outOfStock.productId,
        },
        { status: 409 }
      )
    }

    // Every figure below comes from the database, never from the request.
    const orderItems = cartLines.map((line) => {
      const product = line.product!
      const price = getEffectiveIdrPrice(product)

      return {
        product_id: product.id,
        product_name: product.name,
        product_image_url: product.image_url,
        product_sku: null,
        quantity: line.quantity,
        size: line.size,
        color: line.color,
        price,
        subtotal: round2(price * line.quantity),
      }
    })

    const subtotal = computeSubtotal(cartLines)

    const quote = await getShippingQuotes(serviceClient, {
      destination: toDestination(address),
      items: toParcelItems(cartLines),
      subtotal,
    })

    if (quote.options.length === 0) {
      return NextResponse.json(
        {
          message: quote.isInternational
            ? 'Pengiriman internasional belum tersedia untuk alamat ini.'
            : 'Tidak ada layanan pengiriman untuk alamat ini.',
        },
        { status: 409 }
      )
    }

    // Re-quoting can legitimately change the option set (a promo expired, a
    // courier dropped out). Rejecting an unknown pick is safer than silently
    // charging for a service the customer did not choose.
    const chosen =
      courierCode && serviceCode
        ? findQuote(quote.options, courierCode, serviceCode)
        : quote.options[0]

    if (!chosen) {
      return NextResponse.json(
        {
          message:
            'Layanan pengiriman yang dipilih sudah tidak tersedia. Silakan pilih ulang ongkir.',
          code: 'SHIPPING_OPTION_UNAVAILABLE',
        },
        { status: 409 }
      )
    }

    const shippingCost = round2(chosen.finalCost)
    const orderDiscount = round2(Math.min(chosen.orderDiscount, subtotal))
    const taxableAmount = Math.max(0, subtotal - orderDiscount)
    const tax = round2(taxableAmount * TAX_RATE)
    const total = round2(taxableAmount + shippingCost + tax)

    // Lock the rate PayPal will convert with, so the USD amount cannot drift
    // between this page and the capture.
    const fxRate = await getIdrPerUsdRate().catch(() => null)

    const { data: generatedNumber } = await serviceClient.rpc('generate_order_number')
    const orderNumber = (generatedNumber as string) || `BRN${Date.now()}`

    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: caller.userId,
        customer_name: address.recipient_name,
        customer_email: caller.email,
        customer_phone: address.phone,
        subtotal,
        shipping_cost: shippingCost,
        tax,
        discount: orderDiscount,
        total,
        payment_method: paymentMethod,
        shipping_address_id: address.id,
        customer_notes: customerNotes || null,

        courier: `${chosen.courierName} ${chosen.serviceName}`.trim(),
        shipping_courier_code: chosen.courierCode,
        shipping_service_code: chosen.serviceCode,
        shipping_service_name: chosen.serviceName,
        shipping_base_cost: chosen.baseCost,
        shipping_discount: chosen.discount,
        shipping_etd_min_days: chosen.etdMinDays,
        shipping_etd_max_days: chosen.etdMaxDays,
        shipping_weight_grams: quote.parcel.weightGrams,
        shipping_zone_code: chosen.zoneCode,
        shipping_provider: chosen.provider,
        applied_promotions: chosen.appliedPromotions,
        fx_rate_idr_usd: fxRate,
      })
      .select()
      .single()

    if (orderError) throw orderError

    const { error: itemsError } = await serviceClient
      .from('order_items')
      .insert(orderItems.map((item) => ({ ...item, order_id: order.id })))

    if (itemsError) {
      // Never leave a total with no lines behind it.
      await serviceClient.from('orders').delete().eq('id', order.id)
      throw itemsError
    }

    const paymentGateway =
      paymentMethod === 'paypal' ? 'paypal' : method.requires_proof ? 'manual' : 'custom'

    const { error: paymentError } = await serviceClient.from('payments').insert({
      order_id: order.id,
      payment_method: paymentMethod,
      amount: total,
      payment_gateway: paymentGateway,
      status: 'pending',
    })

    if (paymentError) throw paymentError

    // Usage counters are advisory: a failure here must not undo a paid-for order.
    if (chosen.appliedPromotions.length > 0) {
      await serviceClient
        .rpc('increment_promotion_usage', {
          promotion_ids: chosen.appliedPromotions.map((promotion) => promotion.id),
        })
        .then(({ error }) => {
          if (error) console.error('Failed to increment promotion usage:', error.message)
        })
    }

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('Error in create-order API:', error)
    return NextResponse.json({ message: 'Failed to create order' }, { status: 500 })
  }
}
