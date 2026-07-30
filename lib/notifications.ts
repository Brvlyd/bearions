import { supabase } from './supabase'

// Client-side trigger for transactional emails.
//
// The browser only names the notification and the order. Recipient address,
// amounts, and item lists are resolved server-side from the database, so
// tampering with this payload cannot redirect an email or fake its contents.

type NotificationType =
  | 'order-confirmation'
  | 'payment-proof-verified'
  | 'payment-proof-rejected'

type SendNotificationParams = {
  type: NotificationType
  orderNumber: string
  rejectionReason?: string
}

async function sendNotification({ type, orderNumber, rejectionReason }: SendNotificationParams) {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token

  if (!accessToken) {
    throw new Error('Not authenticated')
  }

  const response = await fetch('/api/notifications/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ type, orderNumber, rejectionReason }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || 'Failed to send email')
  }
}

export const notificationService = {
  /** Order confirmation after a successful checkout. */
  async sendOrderConfirmationEmail(orderNumber: string): Promise<void> {
    await sendNotification({ type: 'order-confirmation', orderNumber })
  },

  /** Admin approved the uploaded payment proof. */
  async sendPaymentProofVerifiedEmail(orderNumber: string): Promise<void> {
    await sendNotification({ type: 'payment-proof-verified', orderNumber })
  },

  /** Admin rejected the uploaded payment proof. */
  async sendPaymentProofRejectedEmail(orderNumber: string, rejectionReason: string): Promise<void> {
    await sendNotification({ type: 'payment-proof-rejected', orderNumber, rejectionReason })
  },
}
