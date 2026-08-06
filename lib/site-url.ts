// One definition of the origin that goes into links we email out.
//
// Auth mail is opened outside the tab that asked for it, often on another
// device, so window.location.origin is the wrong source: it is localhost during
// development and a per-deploy hostname on preview builds, and both are dead
// links for whoever reads the message. NEXT_PUBLIC_SITE_URL wins whenever it is
// set; the caller's own origin is only a fallback so local work keeps running
// without configuration.

const trimTrailingSlash = (url: string) => url.replace(/\/+$/, '')

export const getSiteOrigin = (fallbackOrigin = '') => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return trimTrailingSlash(configured)

  return trimTrailingSlash(fallbackOrigin.trim())
}

/**
 * The live storefront origin. bearions.store 308-redirects to the www host, so
 * that is the canonical one search engines should be pointed at.
 */
export const DEFAULT_SITE_ORIGIN = 'https://www.bearions.store'

/**
 * Origin used for anything a crawler or another site reads: canonical links,
 * Open Graph URLs, robots.txt, sitemap.xml. Unlike `getSiteOrigin` this never
 * falls back to the current request's host — a preview deployment must not
 * publish itself as the canonical site — so it resolves to the production
 * domain whenever NEXT_PUBLIC_SITE_URL is unset.
 */
export const getPublicSiteOrigin = () =>
  getSiteOrigin() || DEFAULT_SITE_ORIGIN

/** Origin of the browser currently running, used as the fallback on the client. */
export const getBrowserOrigin = () =>
  typeof window !== 'undefined' ? window.location.origin : ''

/**
 * Where {{ .ConfirmationURL }} in the signup email lands. /auth/confirm redeems
 * the token, keeps the session it produces and forwards to the dashboard, so the
 * recipient arrives signed in instead of back at the login form.
 *
 * Supabase appends its own token parameters to this URL, so it must stay a plain
 * absolute link with no fragment.
 */
export const buildEmailConfirmUrl = (origin: string, email?: string) => {
  if (!origin) return undefined

  const params = new URLSearchParams()
  if (email) params.set('email', email)

  const query = params.toString()
  return query ? `${origin}/auth/confirm?${query}` : `${origin}/auth/confirm`
}

/** Where the password recovery link lands. Same origin rules as the confirm link. */
export const buildPasswordResetUrl = (origin: string) =>
  origin ? `${origin}/auth/reset-password` : undefined
