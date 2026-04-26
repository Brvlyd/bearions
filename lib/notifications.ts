import { supabase } from './supabase'

export interface EmailNotification {
  to: string
  subject: string
  htmlContent: string
}

export const notificationService = {
  /**
   * Send payment proof verified notification
   */
  async sendPaymentProofVerifiedEmail(
    customerEmail: string,
    orderNumber: string,
    amount: number
  ): Promise<void> {
    try {
      const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(amount)

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
              .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
              .status-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>✓ Bukti Pembayaran Terverifikasi</h2>
              </div>
              <div class="content">
                <p>Halo,</p>
                <p>Terima kasih! Bukti pembayaran Anda telah berhasil <span class="status-badge">TERVERIFIKASI</span> oleh tim kami.</p>
                
                <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p><strong>Detail Pesanan:</strong></p>
                  <p>Nomor Pesanan: <strong>${orderNumber}</strong></p>
                  <p>Jumlah Pembayaran: <strong>${formattedAmount}</strong></p>
                </div>
                
                <p>Pesanan Anda akan segera diproses dan dikirimkan. Anda akan menerima notifikasi pelacakan pengiriman ketika barang dikirim.</p>
                
                <p>Jika ada pertanyaan, jangan ragu untuk menghubungi tim customer service kami.</p>
                
                <p>Terima kasih telah berbelanja dengan kami!</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 Bearions. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `

      await notificationService.sendEmail({
        to: customerEmail,
        subject: `Bukti Pembayaran Terverifikasi - Pesanan ${orderNumber}`,
        htmlContent,
      })
    } catch (error) {
      console.error('Error sending payment verified email:', error)
      throw error
    }
  },

  /**
   * Send payment proof rejected notification
   */
  async sendPaymentProofRejectedEmail(
    customerEmail: string,
    orderNumber: string,
    rejectionReason: string
  ): Promise<void> {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
              .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
              .reason-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>⚠ Bukti Pembayaran Ditolak</h2>
              </div>
              <div class="content">
                <p>Halo,</p>
                <p>Bukti pembayaran untuk pesanan Anda telah ditinjau. Sayangnya, bukti yang Anda submit tidak dapat diterima.</p>
                
                <div class="reason-box">
                  <p><strong>Alasan Penolakan:</strong></p>
                  <p>${rejectionReason || 'Bukti pembayaran tidak jelas atau tidak memenuhi kriteria'}</p>
                </div>
                
                <p><strong>Pesanan:</strong> ${orderNumber}</p>
                
                <p>Silakan upload bukti pembayaran yang lebih jelas. Pastikan:</p>
                <ul>
                  <li>Bukti pembayaran menunjukkan nama penerima dan nomor rekening</li>
                  <li>Tanggal dan waktu transaksi terlihat jelas</li>
                  <li>File dalam format JPG, PNG, WebP, atau PDF</li>
                  <li>Ukuran file tidak lebih dari 2MB</li>
                </ul>
                
                <p>Klik tombol di bawah untuk submit bukti pembayaran yang baru:</p>
                <p><a href="https://bearions.com/payment/${orderNumber}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Upload Bukti Pembayaran</a></p>
                
                <p>Jika ada pertanyaan, silakan hubungi tim customer service kami.</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 Bearions. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `

      await notificationService.sendEmail({
        to: customerEmail,
        subject: `Bukti Pembayaran Ditolak - Pesanan ${orderNumber}`,
        htmlContent,
      })
    } catch (error) {
      console.error('Error sending payment rejected email:', error)
      throw error
    }
  },

  /**
   * Generic email sending via API route
   */
  async sendEmail(notification: EmailNotification): Promise<void> {
    try {
      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error in sendEmail:', error)
      throw error
    }
  },
}
