import type { SupabaseClient } from '@supabase/supabase-js'
import type { PayPalCaptureResult } from './paypal'

// Shared settlement rules for PayPal money that has already moved.
//
// Both the browser-driven capture (/api/paypal/capture-order) and the scheduled
// sweep (/api/paypal/reconcile) end up holding the same thing: a capture PayPal
// says succeeded. They must agree on what counts as verified and on how the
// order is marked paid, so that logic lives here rather than in either route.

// A capture never differs from the amount we asked PayPal to charge by more than
// this (covers floating point / string rounding, not a real tolerance for
// underpayment).
const AMOUNT_EPSILON = 0.01

export function isCaptureVerified(params: {
  capture: PayPalCaptureResult
  orderNumber: string
  expectedAmount: number
}): boolean {
  const { capture, orderNumber, expectedAmount } = params
  const capturedAmount = capture.capturedAmount ? Number(capture.capturedAmount) : NaN

  return (
    capture.status === 'COMPLETED' &&
    capture.customId === orderNumber &&
    Number.isFinite(capturedAmount) &&
    Number.isFinite(expectedAmount) &&
    Math.abs(capturedAmount - expectedAmount) <= AMOUNT_EPSILON
  )
}

export async function markCaptureFailed(
  client: SupabaseClient,
  params: { paymentId: string; capture: PayPalCaptureResult }
): Promise<void> {
  await client
    .from('payments')
    .update({
      status: 'failed',
      gateway_response: { stage: 'capture_verification_failed', capture: params.capture.raw },
    })
    .eq('id', params.paymentId)
}

/**
 * Records a verified capture against the order.
 *
 * The customer's money is already gone by the time this runs, so a failed write
 * must never stop the remaining ones or discard the capture id. Only the order
 * row gates fulfilment, so that is the single failure worth surfacing — it
 * throws, and everything else is logged for manual reconciliation.
 */
export async function markOrderPaid(
  client: SupabaseClient,
  params: {
    orderId: string
    orderNumber: string
    paymentId: string
    capture: PayPalCaptureResult
    fallbackTransactionId: string
  }
): Promise<void> {
  const { orderId, orderNumber, paymentId, capture, fallbackTransactionId } = params
  const nowIso = new Date().toISOString()

  const { error: updatePaymentError } = await client
    .from('payments')
    .update({
      status: 'success',
      transaction_id: capture.captureId || fallbackTransactionId,
      gateway_response: { stage: 'captured', capture: capture.raw },
      paid_at: nowIso,
    })
    .eq('id', paymentId)

  if (updatePaymentError) {
    console.error(
      `CRITICAL: PayPal capture succeeded but the payment row was not updated. ` +
        `Reconcile manually — orderNumber=${orderNumber}, captureId=${capture.captureId}:`,
      updatePaymentError
    )
  }

  const { error: updateOrderError } = await client
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'confirmed',
      confirmed_at: nowIso,
    })
    .eq('id', orderId)

  if (updateOrderError) {
    console.error(
      `CRITICAL: PayPal capture succeeded but the order was not marked paid. ` +
        `Reconcile manually — orderNumber=${orderNumber}, captureId=${capture.captureId}:`,
      updateOrderError
    )
    throw new Error(updateOrderError.message)
  }
}
