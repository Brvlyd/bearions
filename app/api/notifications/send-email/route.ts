import { NextRequest, NextResponse } from 'next/server'
import { sendTransactionalEmail } from '@/lib/brevo'

interface EmailRequest {
  to: string
  subject: string
  htmlContent: string
}

// POST /api/notifications/send-email
// Sends transactional email notifications to customers via Brevo.
export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json()

    if (!body.to || !body.subject || !body.htmlContent) {
      return NextResponse.json(
        { message: 'Missing required fields: to, subject, htmlContent' },
        { status: 400 }
      )
    }

    const result = await sendTransactionalEmail({
      to: { email: body.to },
      subject: body.subject,
      htmlContent: body.htmlContent,
    })

    return NextResponse.json(
      {
        message: 'Email sent',
        to: body.to,
        subject: body.subject,
        messageId: result.messageId,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in send-email API:', error)
    return NextResponse.json(
      {
        message: 'Failed to send email',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
