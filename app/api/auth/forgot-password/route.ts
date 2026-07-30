import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTransactionalEmail } from '@/lib/brevo'
import { renderPasswordResetEmail, type EmailLanguage } from '@/lib/email-templates'

// POST /api/auth/forgot-password
//
// Sends the password reset email through Brevo instead of Supabase's built-in
// SMTP: the default sender is heavily rate limited and unbranded. Supabase still
// mints the recovery token, so the security model is unchanged — only the
// delivery and the template are ours.
//
// The response is always a generic success. Telling the caller whether an email
// is registered would turn this endpoint into an account-enumeration oracle.

/** Matches Supabase's default recovery token lifetime (Auth -> Providers -> Email). */
const LINK_EXPIRY_MINUTES = 60

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 3

// Per-instance memory only: it blunts casual abuse but resets on redeploy and is
// not shared across serverless instances. Supabase applies its own limits on top.
const recentRequests = new Map<string, number[]>()

const isRateLimited = (key: string) => {
  const now = Date.now()
  const hits = (recentRequests.get(key) || []).filter((at) => now - at < RATE_LIMIT_WINDOW_MS)

  if (hits.length >= RATE_LIMIT_MAX_REQUESTS) {
    recentRequests.set(key, hits)
    return true
  }

  hits.push(now)
  recentRequests.set(key, hits)

  // Keep the map from growing without bound on a long-lived instance.
  if (recentRequests.size > 5000) {
    for (const [entryKey, timestamps] of recentRequests) {
      if (timestamps.every((at) => now - at >= RATE_LIMIT_WINDOW_MS)) {
        recentRequests.delete(entryKey)
      }
    }
  }

  return false
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const getSiteUrl = (request: NextRequest) => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (configured) return configured

  // Falls back to the deployment's own origin so preview/dev URLs keep working.
  return request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  // Generic payload — returned on success, on unknown emails, and on send failures.
  const genericResponse = NextResponse.json(
    {
      message:
        'Jika email tersebut terdaftar, kami sudah mengirimkan link reset kata sandi. Silakan cek inbox dan folder spam.',
    },
    { status: 200 }
  )

  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const language: EmailLanguage = body.language === 'en' ? 'en' : 'id'

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ message: 'Format email tidak valid.' }, { status: 400 })
    }

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    if (isRateLimited(`${clientIp}:${email}`)) {
      return NextResponse.json(
        { message: 'Terlalu banyak permintaan reset. Coba lagi dalam beberapa menit.' },
        { status: 429 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Forgot password: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is missing')
      return NextResponse.json({ message: 'Email service is not configured.' }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // redirectTo must be listed under Supabase -> Authentication -> URL Configuration,
    // otherwise Supabase silently falls back to the project's Site URL.
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${getSiteUrl(request)}/auth/reset-password` },
    })

    const resetUrl = data?.properties?.action_link

    if (error || !resetUrl) {
      // Unknown email lands here too — log it, but do not tell the caller.
      console.warn('Forgot password: could not generate recovery link', error?.message)
      return genericResponse
    }

    const recipientName =
      (data.user?.user_metadata?.full_name as string | undefined) || undefined

    const { subject, html, text } = renderPasswordResetEmail({
      resetUrl,
      recipientName,
      expiresInMinutes: LINK_EXPIRY_MINUTES,
      language,
    })

    await sendTransactionalEmail({
      to: { email, name: recipientName },
      subject,
      htmlContent: html,
      textContent: text,
      tags: ['password-reset'],
    })

    return genericResponse
  } catch (error) {
    // A Brevo outage should not reveal whether the account exists either.
    console.error('Error in forgot-password API:', error)
    return genericResponse
  }
}
