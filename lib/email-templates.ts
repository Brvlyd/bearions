// Shared HTML for transactional emails.
//
// Email clients are not browsers: Gmail strips <style> blocks on some clients,
// Outlook renders through Word, and flexbox/grid are unsupported. Everything
// here is therefore table-based with inline styles and a 600px max width.

export type EmailLanguage = 'en' | 'id'

const BRAND_NAME = 'Bearion'
const BRAND_COLOR = '#000000'
const TEXT_COLOR = '#1f2937'
const MUTED_COLOR = '#6b7280'
const BORDER_COLOR = '#e5e7eb'
const CANVAS_COLOR = '#f3f4f6'
const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escape anything user-supplied before it goes into email HTML. */
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])

type LayoutParams = {
  /** Inbox preview line. Shown next to the subject before the mail is opened. */
  preheader: string
  heading: string
  bodyHtml: string
}

const renderLayout = ({ preheader, heading, bodyHtml }: LayoutParams) => `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(heading)}</title>
    <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
    <![endif]-->
  </head>
  <body style="margin:0; padding:0; width:100%; background-color:${CANVAS_COLOR}; -webkit-font-smoothing:antialiased;">
    <div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
      ${escapeHtml(preheader)}
    </div>
    <!-- Zero-width characters stop clients from pulling body copy into the preview line. -->
    <div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
      &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CANVAS_COLOR};">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#ffffff; border:1px solid ${BORDER_COLOR}; border-radius:8px; overflow:hidden;">
            <tr>
              <td align="center" style="background-color:${BRAND_COLOR}; padding:28px 24px;">
                <span style="font-family:${FONT_STACK}; font-size:22px; font-weight:bold; letter-spacing:2px; color:#ffffff;">
                  ${BRAND_NAME.toUpperCase()}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px 8px 24px;">
                <h1 style="margin:0 0 16px 0; font-family:${FONT_STACK}; font-size:22px; line-height:30px; font-weight:bold; color:${TEXT_COLOR};">
                  ${escapeHtml(heading)}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 32px 24px; font-family:${FONT_STACK}; font-size:15px; line-height:24px; color:${TEXT_COLOR};">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background-color:#f9fafb; border-top:1px solid ${BORDER_COLOR}; padding:20px 24px; font-family:${FONT_STACK}; font-size:12px; line-height:18px; color:${MUTED_COLOR};" align="center">
                <p style="margin:0;">&copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
                <p style="margin:6px 0 0 0;">Email ini dikirim otomatis, mohon tidak membalas pesan ini.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

/**
 * "Bulletproof" button: Outlook renders the VML rectangle, every other client
 * renders the anchor. Both point at the same URL.
 */
const renderButton = (url: string, label: string) => {
  const safeUrl = escapeHtml(url)
  const safeLabel = escapeHtml(label)

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 24px auto;">
      <tr>
        <td align="center">
          <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:48px; v-text-anchor:middle; width:280px;" arcsize="12%" stroke="f" fillcolor="${BRAND_COLOR}">
              <w:anchorlock/>
              <center style="color:#ffffff; font-family:Arial, sans-serif; font-size:16px; font-weight:bold;">${safeLabel}</center>
            </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
            <a href="${safeUrl}" target="_blank" rel="noopener"
               style="display:inline-block; background-color:${BRAND_COLOR}; color:#ffffff; font-family:${FONT_STACK}; font-size:16px; font-weight:bold; line-height:48px; text-align:center; text-decoration:none; width:280px; border-radius:6px;">
              ${safeLabel}
            </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`
}

export type PasswordResetEmailParams = {
  /** Single-use recovery link generated by Supabase. */
  resetUrl: string
  /** Shown in the greeting. Falls back to a neutral greeting when absent. */
  recipientName?: string | null
  /** Must match the Supabase token lifetime so the copy stays truthful. */
  expiresInMinutes?: number
  language?: EmailLanguage
}

/**
 * Password reset email. Returns the HTML part plus a plain-text alternative —
 * sending both improves deliverability and covers text-only clients.
 */
export function renderPasswordResetEmail({
  resetUrl,
  recipientName,
  expiresInMinutes = 60,
  language = 'id',
}: PasswordResetEmailParams): { subject: string; html: string; text: string } {
  const isEnglish = language === 'en'
  const safeName = recipientName ? escapeHtml(recipientName) : null
  const safeUrl = escapeHtml(resetUrl)

  const copy = isEnglish
    ? {
        subject: `Reset your ${BRAND_NAME} password`,
        preheader: `Use this link within ${expiresInMinutes} minutes to set a new password.`,
        heading: 'Reset your password',
        greeting: safeName ? `Hi ${safeName},` : 'Hi,',
        intro: `We received a request to reset the password for your ${BRAND_NAME} account. Click the button below to choose a new one.`,
        button: 'Reset Password',
        fallback: 'If the button does not work, copy and paste this link into your browser:',
        expiry: `This link is valid for ${expiresInMinutes} minutes and can only be used once.`,
        ignore: `If you did not request a password reset, you can safely ignore this email — your password stays unchanged.`,
        security: 'For your security, never share this link with anyone.',
      }
    : {
        subject: `Reset kata sandi ${BRAND_NAME} Anda`,
        preheader: `Gunakan link ini dalam ${expiresInMinutes} menit untuk membuat kata sandi baru.`,
        heading: 'Reset Kata Sandi',
        greeting: safeName ? `Halo ${safeName},` : 'Halo,',
        intro: `Kami menerima permintaan untuk mengatur ulang kata sandi akun ${BRAND_NAME} Anda. Klik tombol di bawah untuk membuat kata sandi baru.`,
        button: 'Reset Kata Sandi',
        fallback: 'Jika tombol di atas tidak berfungsi, salin dan tempel link berikut ke browser Anda:',
        expiry: `Link ini berlaku ${expiresInMinutes} menit dan hanya dapat digunakan satu kali.`,
        ignore: 'Jika Anda tidak meminta reset kata sandi, abaikan saja email ini — kata sandi Anda tidak akan berubah.',
        security: 'Demi keamanan, jangan pernah membagikan link ini kepada siapa pun.',
      }

  const bodyHtml = `
    <p style="margin:0 0 16px 0;">${copy.greeting}</p>
    <p style="margin:0 0 24px 0;">${copy.intro}</p>

    ${renderButton(resetUrl, copy.button)}

    <p style="margin:0 0 8px 0; font-size:13px; color:${MUTED_COLOR};">${copy.fallback}</p>
    <p style="margin:0 0 24px 0; font-size:13px; word-break:break-all;">
      <a href="${safeUrl}" target="_blank" rel="noopener" style="color:#2563eb; text-decoration:underline;">${safeUrl}</a>
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb; border-left:4px solid #f59e0b; border-radius:4px;">
      <tr>
        <td style="padding:14px 16px; font-family:${FONT_STACK}; font-size:13px; line-height:20px; color:#92400e;">
          ${copy.expiry}
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0 0; font-size:13px; color:${MUTED_COLOR};">${copy.ignore}</p>
    <p style="margin:8px 0 0 0; font-size:13px; color:${MUTED_COLOR};">${copy.security}</p>`

  const text = [
    copy.greeting.replace(/&#39;/g, "'"),
    '',
    copy.intro,
    '',
    resetUrl,
    '',
    copy.expiry,
    copy.ignore,
    copy.security,
    '',
    `© ${new Date().getFullYear()} ${BRAND_NAME}`,
  ].join('\n')

  return {
    subject: copy.subject,
    html: renderLayout({ preheader: copy.preheader, heading: copy.heading, bodyHtml }),
    text,
  }
}
