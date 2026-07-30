import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, getServiceClient } from '@/lib/api-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// POST /api/orders/create
//
// Orders used to be assembled in the browser: the client sent each item's price
// and the derived total straight into an INSERT. Anyone could therefore order
// any product for Rp 1 by editing the request, and PayPal would happily charge
// that total because the gateway route reads it back from the database.
//
// Here the client sends no money at all — only which address and payment method
// to use. Items come from the caller's own cart and every price is read from the
// products table, so the total is server-authoritative.

/** Flat shipping fee, mirroring what the checkout page displays. */
const SHIPPING_COST_IDR = 15000
const TAX_RATE = 0.11

const round2 = (value: number) => Math.round(value * 100) / 100

type CartRow = {
  id: string
  quantity: number
  size: string | null
  color: string | null
  product_id: string
  products: {
    id: string
    name: string
    price: number
    stock: number
    image_url: string | null
  } | null
}

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
    const customerNotes =
      typeof body.customerNotes === 'string' ? body.customerNotes.trim().slice(0, 1000) : ''

    if (!shippingAddressId || !paymentMethod) {
      return NextResponse.json(
        { message: 'Missing shippingAddressId or paymentMethod' },
        { status: 400 }
      )
    }

    const serviceClient = getServiceClient()

    // The address must belong to the caller — it supplies the recipient name and
    // phone that end up on the order.
    const { data: address } = await serviceClient
      .from('shipping_addresses')
      .select('id, user_id, recipient_name, phone')
      .eq('id', shippingAddressId)
      .eq('user_id', caller.userId)
      .maybeSingle()

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

    const { data: cart } = await serviceClient
      .from('carts')
      .select('id')
      .eq('user_id', caller.userId)
      .maybeSingle()

    if (!cart) {
      return NextResponse.json({ message: 'Cart is empty' }, { status: 400 })
    }

    const { data: cartItems, error: cartError } = await serviceClient
      .from('cart_items')
      .select('id, quantity, size, color, product_id, products(id, name, price, stock, image_url)')
      .eq('cart_id', cart.id)

    if (cartError) throw cartError

    const items = (cartItems || []) as unknown as CartRow[]

    if (items.length === 0) {
      return NextResponse.json({ message: 'Cart is empty' }, { status: 400 })
    }

    const missingProduct = items.find((item) => !item.products)
    if (missingProduct) {
      return NextResponse.json(
        { message: 'A product in your cart is no longer available' },
        { status: 409 }
      )
    }

    const outOfStock = items.find((item) => {
      const quantity = Number(item.quantity) || 0
      return quantity < 1 || quantity > Number(item.products!.stock)
    })

    if (outOfStock) {
      return NextResponse.json(
        {
          message: `Stok tidak mencukupi untuk ${outOfStock.products!.name}`,
          productId: outOfStock.product_id,
        },
        { status: 409 }
      )
    }

    // Every figure below comes from the database, never from the request.
    const orderItems = items.map((item) => {
      const product = item.products!
      const price = Number(product.price) || 0
      const quantity = Number(item.quantity) || 0

      return {
        product_id: product.id,
        product_name: product.name,
        product_image_url: product.image_url,
        product_sku: null,
        quantity,
        size: item.size,
        color: item.color,
        price,
        subtotal: round2(price * quantity),
      }
    })

    const subtotal = round2(orderItems.reduce((sum, item) => sum + item.subtotal, 0))
    const tax = round2(subtotal * TAX_RATE)
    const total = round2(subtotal + SHIPPING_COST_IDR + tax)

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
        shipping_cost: SHIPPING_COST_IDR,
        tax,
        discount: 0,
        total,
        payment_method: paymentMethod,
        shipping_address_id: address.id,
        customer_notes: customerNotes || null,
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

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('Error in create-order API:', error)
    return NextResponse.json({ message: 'Failed to create order' }, { status: 500 })
  }
}
