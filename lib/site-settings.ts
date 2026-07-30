import { SiteSettings, supabase } from '@/lib/supabase'

type SupabaseErrorLike = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

export const DEFAULT_FAVICON_URL = '/favicon.ico'

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 1,
  site_title: 'Bearions - Modern Fashion Store',
  site_description: 'Premium clothing and fashion accessories',
  favicon_url: null,
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

  return {
    message,
    details,
    hint,
    code,
    isMissingTableError,
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
      tableMissing: parsedError.isMissingTableError,
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
