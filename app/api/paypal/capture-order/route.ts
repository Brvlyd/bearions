import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { capturePayPalOrder } from '@/lib/paypal'

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

// A capture never differs from the amount we asked PayPal to charge by more than this
// (covers floating point / string rounding, not a real tolerance for underpayment).
const AMOUNT_EPSILON = 0.01

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

    const capturedAmount = capture.capturedAmount ? Number(capture.capturedAmount) : NaN
    const expectedAmount = Number(payment.amount)

    const isVerified =
      capture.status === 'COMPLETED' &&
      capture.customId === order.order_number &&
      Number.isFinite(capturedAmount) &&
      Math.abs(capturedAmount - expectedAmount) <= AMOUNT_EPSILON

    if (!isVerified) {
      console.error('PayPal capture failed verification:', {
        orderNumber,
        paypalOrderId,
        capture,
        expectedAmount,
      })

      await serviceClient
        .from('payments')
        .update({
          status: 'failed',
          gateway_response: { stage: 'capture_verification_failed', capture: capture.raw },
        })
        .eq('id', payment.id)

      return NextResponse.json({ message: 'PayPal payment could not be verified' }, { status: 402 })
    }

    const nowIso = new Date().toISOString()

    const { error: updatePaymentError } = await serviceClient
      .from('payments')
      .update({
        status: 'success',
        transaction_id: capture.captureId || paypalOrderId,
        gateway_response: { stage: 'captured', capture: capture.raw },
        paid_at: nowIso,
      })
      .eq('id', payment.id)

    if (updatePaymentError) {
      console.error('Failed to update payment after PayPal capture:', updatePaymentError)
      throw new Error(getErrorMessage(updatePaymentError))
    }

    const { error: updateOrderError } = await serviceClient
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        confirmed_at: nowIso,
      })
      .eq('id', order.id)

    if (updateOrderError) {
      console.error('Failed to update order after PayPal capture:', updateOrderError)
      throw new Error(getErrorMessage(updateOrderError))
    }

    return NextResponse.json({ message: 'Payment captured', orderNumber: order.order_number }, { status: 200 })
  } catch (error) {
    console.error('Error in PayPal capture-order API:', error)
    return NextResponse.json(
      { message: 'Failed to capture PayPal order', error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
