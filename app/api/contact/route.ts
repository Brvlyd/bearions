import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTransactionalEmail } from '@/lib/brevo'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { isEmail, parseEmailList } from '@/lib/contact-content'

interface ContactRequest {
  name: string
  email: string
  subject: string
  message: string
}

// Caps stop an unauthenticated caller from pushing megabytes into the admin
// inbox, and keep a hostile value out of the Reply-To header.
const MAX_LENGTHS = { name: 100, email: 254, subject: 150, message: 5000 } as const

/**
 * Where this submission is delivered: the address set in Admin > Kontak, or the
 * CONTACT_RECEIVER_EMAIL env var when that field is empty.
 *
 * Every failure path lands on the env var rather than on nothing, because the
 * ways this read can fail — migration not applied yet, Supabase unreachable —
 * are exactly the moments when losing a customer's message would be worst.
 *
 * Uses its own session-less client instead of `lib/supabase` so no per-user auth
 * state is shared between requests on the server.
 */
async function loadRecipients(): Promise<string[]> {
  const fromEnv = parseEmailList(process.env.CONTACT_RECEIVER_EMAIL || '').filter(isEmail)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Contact recipient: Supabase env missing, ignoring the address set in Admin > Kontak')
    return fromEnv
  }

  try {
    const { data, error } = await createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
      .from('site_settings')
      .select('contact_form_recipient')
      .eq('id', 1)
      .maybeSingle()

    if (error || !data) {
      // Loud on purpose: the admin sees a saved address in the CMS, so a silent
      // fallback here would look like the setting is simply being ignored.
      console.warn('Contact recipient: falling back to CONTACT_RECEIVER_EMAIL —', error?.message || 'no settings row')
      return fromEnv
    }

    const configured = parseEmailList(String(data.contact_form_recipient || '')).filter(isEmail)
    return configured.length > 0 ? configured : fromEnv
  } catch (error) {
    console.warn('Contact recipient: settings read failed, falling back to CONTACT_RECEIVER_EMAIL —', error)
    return fromEnv
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// POST /api/contact
// Forwards contact form submissions to the store's admin inbox via Brevo.
export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit({
      key: `contact:${getClientIp(request)}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        { message: 'Terlalu banyak pesan terkirim. Silakan coba lagi nanti.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    const raw: ContactRequest = await request.json()

    const body: ContactRequest = {
      name: String(raw?.name ?? '').trim().slice(0, MAX_LENGTHS.name),
      email: String(raw?.email ?? '').trim().slice(0, MAX_LENGTHS.email),
      subject: String(raw?.subject ?? '').trim().slice(0, MAX_LENGTHS.subject),
      message: String(raw?.message ?? '').trim().slice(0, MAX_LENGTHS.message),
    }

    if (!body.name || !body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { message: 'Missing required fields: name, email, subject, message' },
        { status: 400 }
      )
    }

    if (!isEmail(body.email)) {
      return NextResponse.json({ message: 'Format email tidak valid.' }, { status: 400 })
    }

    const recipients = await loadRecipients()
    if (recipients.length === 0) {
      console.error(
        'No contact recipient configured: set one in Admin > Kontak (site_settings.contact_form_recipient) or CONTACT_RECEIVER_EMAIL'
      )
      return NextResponse.json(
        { message: 'Contact form is not configured' },
        { status: 500 }
      )
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Pesan Baru dari Formulir Kontak</h2>
            <p><strong>Nama:</strong> ${escapeHtml(body.name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(body.email)}</p>
            <p><strong>Subjek:</strong> ${escapeHtml(body.subject)}</p>
            <p><strong>Pesan:</strong></p>
            <p>${escapeHtml(body.message).replace(/\n/g, '<br />')}</p>
          </div>
        </body>
      </html>
    `

    await sendTransactionalEmail({
      to: recipients.map((email) => ({ email })),
      subject: `[Kontak Bearion] ${body.subject}`,
      htmlContent,
      replyTo: { email: body.email, name: body.name },
    })

    return NextResponse.json({ message: 'Message sent' }, { status: 200 })
  } catch (error) {
    console.error('Error in contact API:', error)
    return NextResponse.json({ message: 'Failed to send message' }, { status: 500 })
  }
}
