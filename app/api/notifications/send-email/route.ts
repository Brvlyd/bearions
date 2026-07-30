import { NextRequest, NextResponse } from 'next/server'
import { sendTransactionalEmail } from '@/lib/brevo'
import { authenticateRequest, getServiceClient, isAdminUser } from '@/lib/api-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import {
  renderOrderConfirmationEmail,
  renderPaymentProofRejectedEmail,
  renderPaymentProofVerifiedEmail,
} from '@/lib/email-templates'

// POST /api/notifications/send-email
//
// This route used to accept `to` + `subject` + `htmlContent` from the browser
// with no authentication, which made it an open relay: anyone could send
// arbitrary HTML from the store's verified Brevo sender.
//
// It now accepts only a notification *type* plus an order number. Recipients,
// amounts, and item lists are read from the database; the client cannot
// influence any of them. Callers must present a valid session, and must either
// own the order or be an admin.

type NotificationType =
  | 'order-confirmation'
  | 'payment-proof-verified'
  | 'payment-proof-rejected'

const ADMIN_ONLY_TYPES: NotificationType[] = ['payment-proof-verified', 'payment-proof-rejected']

const NOTIFICATION_TYPES: NotificationType[] = [
  'order-confirmation',
  'payment-proof-verified',
  'payment-proof-rejected',
]

const MAX_REJECTION_REASON_LENGTH = 500

const getSiteUrl = (request: NextRequest) =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || request.nextUrl.origin

export async function POST(request: NextRequest) {
  try {
    const caller = await authenticateRequest(request)

    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Bound how much mail a single account can trigger, whatever the type.
    const limit = checkRateLimit({
      key: `send-email:${caller.userId}:${getClientIp(request)}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        { message: 'Too many notification requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const type = body.type as NotificationType

    if (!NOTIFICATION_TYPES.includes(type)) {
      return NextResponse.json({ message: 'Unknown notification type' }, { status: 400 })
    }

    const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim() : ''

    if (!orderNumber) {
      return NextResponse.json({ message: 'Missing orderNumber' }, { status: 400 })
    }

    const callerIsAdmin = await isAdminUser(caller)

    if (ADMIN_ONLY_TYPES.includes(type) && !callerIsAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = getServiceClient()

    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .select('id, order_number, user_id, customer_name, customer_email, total')
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    // Non-admins may only trigger mail for their own orders. Without this an
    // authenticated customer could spam any other customer's inbox.
    if (!callerIsAdmin && order.user_id !== caller.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    if (!order.customer_email) {
      return NextResponse.json({ message: 'Order has no customer email' }, { status: 422 })
    }

    let email: { subject: string; html: string; text: string }

    if (type === 'order-confirmation') {
      const { data: items, error: itemsError } = await serviceClient
        .from('order_items')
        .select('product_name, quantity, price')
        .eq('order_id', order.id)

      if (itemsError) throw itemsError

      email = renderOrderConfirmationEmail({
        customerName: order.customer_name || 'Pelanggan',
        orderNumber: order.order_number,
        items: (items || []).map((item) => ({
          name: item.product_name as string,
          quantity: Number(item.quantity) || 0,
          price: Number(item.price) || 0,
        })),
        total: Number(order.total) || 0,
      })
    } else if (type === 'payment-proof-verified') {
      const { data: payment } = await serviceClient
        .from('payments')
        .select('amount')
        .eq('order_id', order.id)
        .maybeSingle()

      email = renderPaymentProofVerifiedEmail({
        orderNumber: order.order_number,
        // Prefer the payment row, fall back to the order total.
        amount: Number(payment?.amount ?? order.total) || 0,
        customerName: order.customer_name,
      })
    } else {
      const rejectionReason =
        typeof body.rejectionReason === 'string'
          ? body.rejectionReason.slice(0, MAX_REJECTION_REASON_LENGTH)
          : ''

      email = renderPaymentProofRejectedEmail({
        orderNumber: order.order_number,
        rejectionReason,
        paymentUrl: `${getSiteUrl(request)}/payment/${encodeURIComponent(order.order_number)}`,
        customerName: order.customer_name,
      })
    }

    const result = await sendTransactionalEmail({
      to: { email: order.customer_email, name: order.customer_name || undefined },
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
      tags: [type],
    })

    return NextResponse.json({ message: 'Email sent', messageId: result.messageId }, { status: 200 })
  } catch (error) {
    console.error('Error in send-email API:', error)
    // Never echo the internal error back — it leaks schema and config details.
    return NextResponse.json({ message: 'Failed to send email' }, { status: 500 })
  }
}
