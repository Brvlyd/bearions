import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, getServiceClient } from '@/lib/api-auth'

// POST /api/orders/[orderNumber]/cancel
//
// Lets a customer back out of an order that is still 'pending' — before an
// admin has confirmed it and before any payment succeeded (a successful
// PayPal capture always moves status to 'confirmed', so 'pending' already
// implies unpaid). Restores the stock that was reserved at order creation.

type RouteContext = {
  params: Promise<{ orderNumber: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const caller = await authenticateRequest(request)
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { orderNumber } = await context.params
    if (!orderNumber) {
      return NextResponse.json({ message: 'Missing orderNumber' }, { status: 400 })
    }

    const serviceClient = getServiceClient()

    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .select('id, user_id, status')
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (orderError || !order || order.user_id !== caller.userId) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { message: 'Only orders that are still pending can be cancelled' },
        { status: 409 }
      )
    }

    // Guards the race where an admin confirms the order between the read above
    // and this write — only actually cancel if it is still 'pending'.
    const { data: cancelled, error: updateError } = await serviceClient
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (updateError) {
      console.error('Failed to cancel order:', updateError)
      return NextResponse.json({ message: 'Failed to cancel order' }, { status: 500 })
    }

    if (!cancelled) {
      return NextResponse.json(
        { message: 'Only orders that are still pending can be cancelled' },
        { status: 409 }
      )
    }

    await serviceClient
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('order_id', order.id)
      .neq('status', 'success')

    const { error: stockError } = await serviceClient.rpc('restore_order_stock', {
      target_order_id: order.id,
    })

    // The order is already cancelled at this point — a stock hiccup shouldn't
    // undo that. Log it for manual reconciliation instead of failing the request.
    if (stockError) {
      console.error(`Failed to restore stock after cancelling order ${orderNumber}:`, stockError)
    }

    return NextResponse.json({ message: 'Order cancelled' }, { status: 200 })
  } catch (error) {
    console.error('Error cancelling order:', error)
    return NextResponse.json({ message: 'Failed to cancel order' }, { status: 500 })
  }
}
