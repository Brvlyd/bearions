// Server-only helper for sending transactional emails via Brevo (formerly Sendinblue).
// Requires BREVO_API_KEY and BREVO_SENDER_EMAIL to be set in the environment.

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

export type BrevoRecipient = {
  email: string
  name?: string
}

export type SendTransactionalEmailParams = {
  to: BrevoRecipient | BrevoRecipient[]
  subject: string
  htmlContent: string
  /** Plain-text alternative. Sending one alongside the HTML helps deliverability. */
  textContent?: string
  replyTo?: BrevoRecipient
  /** Brevo tags, useful for filtering transactional logs per email type. */
  tags?: string[]
}

export async function sendTransactionalEmail({
  to,
  subject,
  htmlContent,
  textContent,
  replyTo,
  tags,
}: SendTransactionalEmailParams): Promise<{ messageId: string }> {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME || 'Bearion'

  if (!apiKey || !senderEmail) {
    throw new Error(
      'Brevo is not configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL in your environment.'
    )
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: Array.isArray(to) ? to : [to],
      subject,
      htmlContent,
      ...(textContent ? { textContent } : {}),
      ...(replyTo ? { replyTo } : {}),
      ...(tags && tags.length > 0 ? { tags } : {}),
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Brevo API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  return { messageId: data.messageId }
}
