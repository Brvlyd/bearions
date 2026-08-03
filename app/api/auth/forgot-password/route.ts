import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTransactionalEmail } from '@/lib/brevo'
import { renderPasswordResetEmail, type EmailLanguage } from '@/lib/email-templates'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getSiteOrigin } from '@/lib/site-url'

// POST /api/auth/forgot-password
//
// Sends the password reset email through Brevo instead of Supabase's built-in
// SMTP: the default sender is heavily rate limited and unbranded. Supabase still
// mints the recovery token, so the security model is unchanged — only the
// delivery and the template are ours.
//
// By product decision this endpoint explicitly reports when an email is not
// registered (see the `isNotFound` branch below), trading account-enumeration
// resistance for a clearer "you never signed up with this address" message.

/** Matches Supabase's default recovery token lifetime (Auth -> Providers -> Email). */
const LINK_EXPIRY_MINUTES = 60

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 3

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Falls back to the deployment's own origin so preview/dev URLs keep working. */
const getSiteUrl = (request: NextRequest) => getSiteOrigin(request.nextUrl.origin)

export async function POST(request: NextRequest) {
  let language: EmailLanguage = 'id'

  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    language = body.language === 'en' ? 'en' : 'id'

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { message: language === 'en' ? 'Invalid email format.' : 'Format email tidak valid.' },
        { status: 400 }
      )
    }

    const limit = checkRateLimit({
      key: `forgot-password:${getClientIp(request)}:${email}`,
      limit: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        {
          message:
            language === 'en'
              ? 'Too many reset requests. Please try again in a few minutes.'
              : 'Terlalu banyak permintaan reset. Coba lagi dalam beberapa menit.',
        },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
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
      // Supabase reports an unregistered address as a 404/`user_not_found`
      // AuthApiError — surface that distinctly per product decision, but keep
      // any other failure (outage, bad service key, ...) ambiguous so it falls
      // through to the client-side Supabase-email fallback instead.
      const isNotFound =
        error?.status === 404 || (error?.message ?? '').toLowerCase().includes('not found')

      if (isNotFound) {
        console.warn('Forgot password: no account registered for that address')
        return NextResponse.json(
          {
            message:
              language === 'en'
                ? 'NOT_REGISTERED: This email is not registered. Please sign up first.'
                : 'NOT_REGISTERED: Email ini belum terdaftar. Silakan daftar akun terlebih dahulu.',
          },
          { status: 404 }
        )
      }

      console.error('Forgot password: could not generate recovery link', error?.message)
      return NextResponse.json(
        {
          message:
            language === 'en'
              ? 'Failed to send reset password email. Please try again.'
              : 'Gagal mengirim email reset password. Silakan coba lagi.',
        },
        { status: 500 }
      )
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

    return NextResponse.json(
      {
        message:
          language === 'en'
            ? 'Password reset link sent. Please check your inbox and spam folder.'
            : 'Link reset kata sandi sudah kami kirim. Silakan cek inbox dan folder spam.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in forgot-password API:', error)
    return NextResponse.json(
      {
        message:
          language === 'en'
            ? 'Failed to send reset password email. Please try again.'
            : 'Gagal mengirim email reset password. Silakan coba lagi.',
      },
      { status: 500 }
    )
  }
}
