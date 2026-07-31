import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, getServiceClient, isAdminUser } from '@/lib/api-auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// POST /api/payment-proofs/signed-url
//
// The `uploads` bucket that holds payment proofs is private (see
// make-payment-proofs-bucket-private.sql) — proof images often show a bank
// account number and the customer's full name, so a bare public URL would let
// anyone who ever saw the link view it forever. This route is the only way
// to get a viewable URL: it checks the caller owns the order (or is admin)
// and hands back a link that expires in a few minutes.
//
// The client sends a paymentId, never a storage path — the path is always
// looked up server-side from that payment's own row, so there is no way to
// request a signed URL for a file that isn't attached to the payment asked for.

const PAYMENT_PROOF_BUCKET = process.env.NEXT_PUBLIC_PAYMENT_PROOF_BUCKET || 'uploads'
const SIGNED_URL_TTL_SECONDS = 5 * 60

/**
 * `payment_proof_url` may still hold a legacy full public URL from before the
 * bucket went private, or the bare object path used going forward. Both are
 * handled so old orders keep working without a data migration.
 */
const extractObjectPath = (raw: string): string | null => {
  if (!raw) return null

  if (!raw.startsWith('http')) {
    return raw.replace(/^\/+/, '')
  }

  const marker = `/object/public/${PAYMENT_PROOF_BUCKET}/`
  const index = raw.indexOf(marker)
  if (index === -1) return null

  try {
    return decodeURIComponent(raw.slice(index + marker.length))
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const caller = await authenticateRequest(request)

    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const limit = checkRateLimit({
      key: `payment-proof-url:${caller.userId}:${getClientIp(request)}`,
      limit: 60,
      windowMs: 10 * 60 * 1000,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : ''

    if (!paymentId) {
      return NextResponse.json({ message: 'Missing paymentId' }, { status: 400 })
    }

    const serviceClient = getServiceClient()

    const { data: payment, error: paymentError } = await serviceClient
      .from('payments')
      .select('id, order_id, payment_proof_url, orders(user_id)')
      .eq('id', paymentId)
      .maybeSingle()

    if (paymentError || !payment) {
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 })
    }

    const orderUserId = (payment.orders as unknown as { user_id: string | null } | null)?.user_id

    const callerIsAdmin = await isAdminUser(caller)

    if (!callerIsAdmin && orderUserId !== caller.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    if (!payment.payment_proof_url) {
      return NextResponse.json({ message: 'No proof uploaded for this payment' }, { status: 404 })
    }

    const objectPath = extractObjectPath(payment.payment_proof_url)

    if (!objectPath) {
      return NextResponse.json({ message: 'Stored proof reference is invalid' }, { status: 500 })
    }

    const { data: signed, error: signError } = await serviceClient.storage
      .from(PAYMENT_PROOF_BUCKET)
      .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS)

    if (signError || !signed?.signedUrl) {
      console.error('Failed to create signed URL for payment proof:', signError?.message)
      return NextResponse.json({ message: 'Failed to generate proof URL' }, { status: 500 })
    }

    return NextResponse.json(
      { url: signed.signedUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in payment-proofs signed-url API:', error instanceof Error ? error.message : error)
    return NextResponse.json({ message: 'Failed to generate proof URL' }, { status: 500 })
  }
}
