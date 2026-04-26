import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type ReviewAction = 'approve' | 'reject'

interface ReviewRequestBody {
  paymentId: string
  orderId: string
  action: ReviewAction
  rejectionReason?: string
}

const PAYMENT_REJECTION_PREFIX = '[PAYMENT_REJECTION]'

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    const parts = [
      typeof err.message === 'string' ? err.message : '',
      typeof err.details === 'string' ? err.details : '',
      typeof err.hint === 'string' ? err.hint : '',
      typeof err.code === 'string' ? `code: ${err.code}` : '',
    ].filter(Boolean)

    if (parts.length > 0) {
      return parts.join(' | ')
    }
  }

  return 'Unknown error'
}

const isPermissionOrSchemaIssue = (message: string) => {
  const lower = message.toLowerCase()
  return (
    lower.includes('pgrst204') ||
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('policy') ||
    (lower.includes('column') && lower.includes('proof_'))
  )
}

const getSupabaseSessionClient = (accessToken: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iktbpmqahpkboovgbbib.supabase.co'

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_U1bLx1ViEflYjYCCaEJR6w_yTqsN-PK'

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

const isAdminUser = async (supabaseClient: ReturnType<typeof getSupabaseSessionClient>, userId: string) => {
  const { data: adminByTable } = await supabaseClient
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (adminByTable) return true

  const { data: adminByRole } = await supabaseClient
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .eq('role', 'admin')
    .maybeSingle()

  return !!adminByRole
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as ReviewRequestBody

    if (!body.paymentId || !body.orderId || !body.action) {
      return NextResponse.json(
        { message: 'Missing required fields: paymentId, orderId, action' },
        { status: 400 }
      )
    }

    if (body.action === 'reject' && !body.rejectionReason?.trim()) {
      return NextResponse.json(
        { message: 'Rejection reason is required for reject action' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseSessionClient(accessToken)

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser()

    if (userError || !userData.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isAdminUser(supabaseAdmin, userData.user.id)

    if (!isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { data: payment, error: paymentFetchError } = await supabaseAdmin
      .from('payments')
      .select('id, order_id, payment_proof_url')
      .eq('id', body.paymentId)
      .eq('order_id', body.orderId)
      .maybeSingle()

    if (paymentFetchError) {
      throw new Error(getErrorMessage(paymentFetchError))
    }

    if (!payment) {
      return NextResponse.json({ message: 'Payment record not found' }, { status: 404 })
    }

    if (body.action === 'approve' && !payment.payment_proof_url) {
      return NextResponse.json(
        { message: 'Payment proof is required before approval' },
        { status: 400 }
      )
    }

    const verificationStatus = body.action === 'approve' ? 'verified' : 'rejected'
    const paymentStatus = body.action === 'approve' ? 'paid' : 'pending'

    let paymentUpdateWarning: string | null = null

    const { error: updatePaymentError } = await supabaseAdmin
      .from('payments')
      .update({
        proof_verification_status: verificationStatus,
        proof_verified_by: userData.user.id,
        proof_verified_at: new Date().toISOString(),
      })
      .eq('id', body.paymentId)
      .eq('order_id', body.orderId)

    if (updatePaymentError) {
      const updatePaymentMessage = getErrorMessage(updatePaymentError)

      if (isPermissionOrSchemaIssue(updatePaymentMessage)) {
        paymentUpdateWarning =
          'Approval succeeded, but proof verification columns are missing or blocked. Run add-payment-proof-verification.sql and fix-admin-orders-rls.sql in Supabase SQL Editor for full tracking.'
      } else {
        throw new Error(updatePaymentMessage)
      }
    }

    const { data: existingOrder, error: orderFetchError } = await supabaseAdmin
      .from('orders')
      .select('admin_notes')
      .eq('id', body.orderId)
      .maybeSingle()

    if (orderFetchError) {
      throw new Error(getErrorMessage(orderFetchError))
    }

    const currentAdminNotes = typeof existingOrder?.admin_notes === 'string' ? existingOrder.admin_notes : null

    const nextAdminNotes = body.action === 'reject'
      ? `${PAYMENT_REJECTION_PREFIX} ${body.rejectionReason?.trim() || ''}`.trim()
      : currentAdminNotes?.startsWith(PAYMENT_REJECTION_PREFIX)
      ? null
      : currentAdminNotes

    const { error: updateOrderError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: paymentStatus,
        admin_notes: nextAdminNotes,
      })
      .eq('id', body.orderId)

    if (updateOrderError) {
      throw new Error(getErrorMessage(updateOrderError))
    }

    return NextResponse.json(
      {
        message: paymentUpdateWarning
          ? body.action === 'approve'
            ? 'Payment approved with limited verification metadata'
            : 'Payment rejection saved with limited verification metadata'
          : body.action === 'approve'
          ? 'Payment proof approved successfully'
          : 'Payment proof rejected successfully',
        paymentId: body.paymentId,
        orderId: body.orderId,
        proofVerificationStatus: verificationStatus,
        paymentStatus,
        warning: paymentUpdateWarning,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in payment proof review API:', error)
    return NextResponse.json(
      {
        message: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}