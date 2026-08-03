import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { capturePayPalOrder } from '@/lib/paypal'
import { isCaptureVerified, markCaptureFailed, markOrderPaid } from '@/lib/paypal-settlement'

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

// POST /api/paypal/capture-order
// Captures a previously created PayPal order and, only after independently verifying
// the result with PayPal, marks the matching internal order as paid.
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim() : ''
    const paypalOrderId = typeof body.paypalOrderId === 'string' ? body.paypalOrderId.trim() : ''

    if (!orderNumber || !paypalOrderId) {
      return NextResponse.json({ message: 'Missing orderNumber or paypalOrderId' }, { status: 400 })
    }

    const sessionClient = getSupabaseSessionClient(accessToken)
    const { data: userData, error: userError } = await sessionClient.auth.getUser()

    if (userError || !userData.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { data: order, error: orderError } = await sessionClient
      .from('orders')
      .select('id, order_number, user_id, payment_status')
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (orderError || !order || order.user_id !== userData.user.id) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    const serviceClient = getSupabaseServiceClient()

    const { data: payment, error: paymentError } = await serviceClient
      .from('payments')
      .select('id, status, amount, transaction_id')
      .eq('order_id', order.id)
      .eq('payment_gateway', 'paypal')
      .maybeSingle()

    if (paymentError || !payment) {
      return NextResponse.json(
        { message: 'PayPal payment record not found for this order' },
        { status: 404 }
      )
    }

    // Idempotent: if this was already captured (e.g. duplicate onApprove call), don't re-process.
    if (payment.status === 'success') {
      return NextResponse.json({ message: 'Payment already completed' }, { status: 200 })
    }

    // The PayPal order id must match the one we generated for this exact order —
    // this stops a capture for a different (e.g. cheaper) order being replayed here.
    if (payment.transaction_id !== paypalOrderId) {
      return NextResponse.json({ message: 'PayPal order does not match this order' }, { status: 400 })
    }

    const capture = await capturePayPalOrder(paypalOrderId)
    const expectedAmount = Number(payment.amount)

    if (!isCaptureVerified({ capture, orderNumber: order.order_number, expectedAmount })) {
      console.error('PayPal capture failed verification:', {
        orderNumber,
        paypalOrderId,
        capture,
        expectedAmount,
      })

      await markCaptureFailed(serviceClient, { paymentId: payment.id, capture })

      return NextResponse.json({ message: 'PayPal payment could not be verified' }, { status: 402 })
    }

    await markOrderPaid(serviceClient, {
      orderId: order.id,
      orderNumber: order.order_number,
      paymentId: payment.id,
      capture,
      fallbackTransactionId: paypalOrderId,
    })

    return NextResponse.json({ message: 'Payment captured', orderNumber: order.order_number }, { status: 200 })
  } catch (error) {
    console.error('Error in PayPal capture-order API:', getErrorMessage(error))
    return NextResponse.json({ message: 'Failed to capture PayPal order' }, { status: 500 })
  }
}
