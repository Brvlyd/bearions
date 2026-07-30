import { NextRequest, NextResponse } from 'next/server'
import { sendTransactionalEmail } from '@/lib/brevo'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

interface ContactRequest {
  name: string
  email: string
  subject: string
  message: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Caps stop an unauthenticated caller from pushing megabytes into the admin
// inbox, and keep a hostile value out of the Reply-To header.
const MAX_LENGTHS = { name: 100, email: 254, subject: 150, message: 5000 } as const

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

    if (!EMAIL_PATTERN.test(body.email)) {
      return NextResponse.json({ message: 'Format email tidak valid.' }, { status: 400 })
    }

    const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL
    if (!receiverEmail) {
      console.error('CONTACT_RECEIVER_EMAIL is not configured')
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
      to: { email: receiverEmail },
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
