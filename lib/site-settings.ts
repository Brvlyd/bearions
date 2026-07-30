import { SiteSettings, supabase } from '@/lib/supabase'

type SupabaseErrorLike = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

export const DEFAULT_FAVICON_URL = '/favicon.ico'

/**
 * Bundled brand mark used whenever no logo has been uploaded in the CMS.
 * Trimmed to the artwork's bounds — the original export padded it out to
 * 1599x899, which left the navbar slot mostly empty and crowded the nav links.
 */
export const DEFAULT_LOGO_URL = '/images/bearion-logo.png'

/**
 * Same mark rendered in white, for the black site header. The bundled artwork
 * is black line work, so on the dark bar it would otherwise be invisible.
 * Only used when no custom logo is set — an uploaded logo is shown as-is,
 * which is why Admin > Site Settings previews it against the black bar.
 */
export const DEFAULT_LOGO_DARK_BG_URL = '/images/bearion-logo-light.png'

/**
 * Intrinsic pixel size of DEFAULT_LOGO_URL. The navbar slot is derived from
 * these numbers so an uploaded replacement occupies exactly the same box as the
 * bundled mark and never reflows the header, whatever its own dimensions are.
 */
export const LOGO_NATURAL_WIDTH = 599
export const LOGO_NATURAL_HEIGHT = 539
export const LOGO_ASPECT_RATIO = `${LOGO_NATURAL_WIDTH} / ${LOGO_NATURAL_HEIGHT}`

/** Rendered navbar logo box, scaled from the intrinsic size to fit the 80px bar. */
export const LOGO_DISPLAY_HEIGHT = 52
export const LOGO_DISPLAY_WIDTH = Math.round(
  (LOGO_DISPLAY_HEIGHT * LOGO_NATURAL_WIDTH) / LOGO_NATURAL_HEIGHT
)

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 1,
  site_title: 'Bearion - Modern Fashion Store',
  site_description: 'Premium clothing and fashion accessories',
  favicon_url: null,
  logo_url: null,
  updated_at: new Date(0).toISOString(),
  updated_by: null,
}

const normalizeSiteSettings = (value: unknown): SiteSettings => {
  const raw = (value || {}) as Record<string, unknown>

  return {
    id: Number(raw.id || 1),
    site_title:
      String(raw.site_title || DEFAULT_SITE_SETTINGS.site_title).trim() ||
      DEFAULT_SITE_SETTINGS.site_title,
    site_description: String(raw.site_description ?? DEFAULT_SITE_SETTINGS.site_description),
    favicon_url:
      typeof raw.favicon_url === 'string' && raw.favicon_url.trim() ? raw.favicon_url.trim() : null,
    logo_url:
      typeof raw.logo_url === 'string' && raw.logo_url.trim() ? raw.logo_url.trim() : null,
    updated_at:
      typeof raw.updated_at === 'string' ? raw.updated_at : DEFAULT_SITE_SETTINGS.updated_at,
    updated_by: typeof raw.updated_by === 'string' ? raw.updated_by : null,
  }
}

export const parseSiteSettingsError = (error: unknown, unknownErrorText = 'Unknown error') => {
  const err = (error || {}) as SupabaseErrorLike
  const message = err.message || unknownErrorText
  const details = err.details || ''
  const hint = err.hint || ''
  const code = err.code || 'UNKNOWN'
  const combined = `${message} ${details} ${hint}`.toLowerCase()

  const isMissingTableError =
    code === '42P01' ||
    code === 'PGRST205' ||
    (combined.includes('site_settings') &&
      (combined.includes('does not exist') ||
        combined.includes('schema cache') ||
        combined.includes('could not find the table')))

  // A table created before logo_url existed fails on write, not on read. The
  // remedy is the same migration, so it surfaces the same "run the SQL" hint.
  const isMissingColumnError =
    code === '42703' ||
    code === 'PGRST204' ||
    (combined.includes('logo_url') &&
      (combined.includes('does not exist') || combined.includes('schema cache')))

  return {
    message,
    details,
    hint,
    code,
    isMissingTableError,
    isMissingColumnError,
    isSchemaMissing: isMissingTableError || isMissingColumnError,
  }
}

export const loadSiteSettings = async () => {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    const parsedError = parseSiteSettingsError(error)
    return {
      data: DEFAULT_SITE_SETTINGS,
      error: parsedError,
      tableMissing: parsedError.isSchemaMissing,
    }
  }

  return {
    data: data ? normalizeSiteSettings(data) : DEFAULT_SITE_SETTINGS,
    error: null,
    tableMissing: false,
  }
}

/**
 * Resolves the favicon href and the icon `type` hint browsers use to pick a
 * renderer. Falls back to the bundled /favicon.ico when nothing is configured.
 */
export const resolveFaviconLink = (faviconUrl: string | null | undefined) => {
  const href = faviconUrl?.trim() || DEFAULT_FAVICON_URL
  const extension = href.split('?')[0].split('.').pop()?.toLowerCase()

  const typeByExtension: Record<string, string> = {
    ico: 'image/x-icon',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
  }

  return {
    href,
    type: (extension && typeByExtension[extension]) || undefined,
  }
}

/**
 * Resolves the navbar logo source, falling back to the bundled brand mark.
 * `version` busts the image cache after an admin replaces a remote logo that
 * reuses its URL; local paths are left alone so Next.js keeps serving them
 * from the static asset cache.
 */
export const resolveLogoUrl = (logoUrl: string | null | undefined, version?: string) => {
  const src = logoUrl?.trim() || DEFAULT_LOGO_URL

  if (src.startsWith('/') || !version) return src

  const separator = src.includes('?') ? '&' : '?'
  return `${src}${separator}v=${encodeURIComponent(version)}`
}

/**
 * Logo for a dark background (the site header). Swaps in the white variant of
 * the bundled mark; a custom logo is returned untouched because its colours are
 * the author's choice, not ours to invert.
 */
export const resolveDarkBgLogoUrl = (logoUrl: string | null | undefined, version?: string) =>
  logoUrl?.trim() ? resolveLogoUrl(logoUrl, version) : DEFAULT_LOGO_DARK_BG_URL
