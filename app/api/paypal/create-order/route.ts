import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPayPalOrder, convertIdrToUsd, getIdrPerUsdRate } from '@/lib/paypal'

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error')

const getSupabaseSessionClient = (accessToken: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const getSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// POST /api/paypal/create-order
// Creates a live PayPal order for an existing internal order, converting IDR -> USD server-side.
// The client only ever sends an orderNumber — amounts are always recomputed from the database.
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim() : ''

    if (!orderNumber) {
      return NextResponse.json({ message: 'Missing orderNumber' }, { status: 400 })
    }

    const sessionClient = getSupabaseSessionClient(accessToken)
    const { data: userData, error: userError } = await sessionClient.auth.getUser()

    if (userError || !userData.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // RLS scopes this SELECT to the caller's own orders; the explicit user_id check below is defense in depth.
    const { data: order, error: orderError } = await sessionClient
      .from('orders')
      .select('id, order_number, total, user_id, payment_status, fx_rate_idr_usd')
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (orderError || !order || order.user_id !== userData.user.id) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ message: 'Order is already paid' }, { status: 409 })
    }

    const serviceClient = getSupabaseServiceClient()

    const { data: payment, error: paymentError } = await serviceClient
      .from('payments')
      .select('id, status')
      .eq('order_id', order.id)
      .eq('payment_gateway', 'paypal')
      .maybeSingle()

    if (paymentError || !payment) {
      return NextResponse.json(
        { message: 'PayPal payment record not found for this order' },
        { status: 404 }
      )
    }

    if (payment.status === 'success') {
      return NextResponse.json({ message: 'Payment already completed' }, { status: 409 })
    }

    // Prefer the rate locked when the order was created, so the USD total the
    // customer is charged matches the one quoted at checkout. Orders created
    // before that column was populated fall back to a live rate.
    const lockedRate = Number(order.fx_rate_idr_usd)
    const idrPerUsd =
      Number.isFinite(lockedRate) && lockedRate > 0 ? lockedRate : await getIdrPerUsdRate()

    const usdAmount = convertIdrToUsd(order.total, idrPerUsd)

    // PayPal rejects a zero total, and it would otherwise mark the order paid
    // for nothing.
    if (Number(usdAmount) <= 0) {
      return NextResponse.json({ message: 'Order total is too small to pay with PayPal' }, { status: 400 })
    }

    const { paypalOrderId } = await createPayPalOrder({
      usdAmount,
      orderNumber: order.order_number,
    })

    const { error: updateError } = await serviceClient
      .from('payments')
      .update({
        transaction_id: paypalOrderId,
        amount: Number(usdAmount),
        currency: 'USD',
        gateway_response: { idrPerUsd, idrAmount: order.total, stage: 'created' },
      })
      .eq('id', payment.id)

    // The capture step matches this stored id against the one PayPal reports.
    // If it never landed, the customer would approve a payment we are then
    // forced to refuse — so fail here, while nothing has been charged.
    if (updateError) {
      console.error('Failed to store PayPal order id on payment record:', updateError)
      return NextResponse.json({ message: 'Failed to create PayPal order' }, { status: 500 })
    }

    return NextResponse.json({ paypalOrderId, usdAmount }, { status: 200 })
  } catch (error) {
    console.error('Error in PayPal create-order API:', getErrorMessage(error))
    return NextResponse.json({ message: 'Failed to create PayPal order' }, { status: 500 })
  }
}
