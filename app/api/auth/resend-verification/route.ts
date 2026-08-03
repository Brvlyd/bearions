import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { buildEmailConfirmUrl, getSiteOrigin } from '@/lib/site-url'

// POST /api/auth/resend-verification
//
// supabase.auth.resend() answers 200 {} for an unregistered address, for an
// already-confirmed one, and for a genuinely pending one alike — only the last
// case actually sends mail. Called straight from the browser it therefore
// reported "verification email sent" when nothing had been sent, leaving users
// waiting on mail that would never arrive.
//
// This route resolves the account server-side and only resends when the address
// is registered and still unconfirmed. The reply is deliberately the same in
// every case: naming which one applied would make this an enumeration oracle.

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 3

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AdminUser = {
  email?: string
  email_confirmed_at?: string | null
}

const findUserByEmail = async (supabaseUrl: string, serviceRoleKey: string, email: string) => {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
  )

  if (!response.ok) {
    throw new Error(`Admin user lookup failed (${response.status})`)
  }

  const body = (await response.json()) as { users?: AdminUser[] }

  // `filter` matches loosely, so confirm the address before trusting the hit.
  return body.users?.find((user) => user.email?.toLowerCase() === email) ?? null
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const isEnglish = body.language === 'en'

  // Returned on success, on unknown emails, and on already-confirmed ones alike.
  const genericResponse = NextResponse.json(
    {
      message: isEnglish
        ? 'If that email is registered and not verified yet, we have sent a new verification link. Check your inbox and spam folder. If nothing arrives within a few minutes, the account is most likely already verified — sign in directly, or use "Forgot password" if you cannot remember it.'
        : 'Jika email tersebut terdaftar dan belum diverifikasi, link verifikasi baru sudah kami kirim. Cek inbox dan folder spam. Bila dalam beberapa menit email tidak juga masuk, kemungkinan besar akun tersebut sudah terverifikasi — silakan langsung login, atau pakai "Lupa password" kalau lupa kata sandinya.',
    },
    { status: 200 }
  )

  try {
    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        {
          message: isEnglish ? 'Invalid email format.' : 'Format email tidak valid.',
        },
        { status: 400 }
      )
    }

    const limit = checkRateLimit({
      key: `resend-verification:${getClientIp(request)}:${email}`,
      limit: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        {
          message: isEnglish
            ? 'Too many verification requests. Please try again in a few minutes.'
            : 'Terlalu banyak permintaan verifikasi. Coba lagi dalam beberapa menit.',
        },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Resend verification: Supabase environment variables are missing')
      return NextResponse.json(
        {
          message: isEnglish ? 'Email service is not configured.' : 'Layanan email belum dikonfigurasi.',
        },
        { status: 500 }
      )
    }

    const user = await findUserByEmail(supabaseUrl, serviceRoleKey, email)

    if (!user) {
      console.warn('Resend verification: no account for that address')
      return genericResponse
    }

    if (user.email_confirmed_at) {
      console.warn('Resend verification: account is already confirmed, nothing to send')
      return genericResponse
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Built server-side so the browser cannot choose where the emailed link points.
    const { error } = await anonClient.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: buildEmailConfirmUrl(getSiteOrigin(request.nextUrl.origin), email),
      },
    })

    if (error) {
      console.error('Resend verification: Supabase refused to resend', error.message)
      return genericResponse
    }

    return NextResponse.json(
      {
        message: isEnglish
          ? 'Verification email sent. Please check your inbox and spam folder.'
          : 'Email verifikasi sudah dikirim. Silakan cek inbox dan folder spam/junk Anda.',
      },
      { status: 200 }
    )
  } catch (error) {
    // A lookup or SMTP outage must not reveal whether the account exists either.
    console.error('Error in resend-verification API:', error)
    return genericResponse
  }
}
