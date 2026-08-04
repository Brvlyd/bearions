import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { SiteSettings } from '@/lib/supabase'
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings'

/**
 * Anonymous, session-less client used for rendering global metadata. It is kept
 * separate from `lib/supabase` so no per-user auth state is shared between
 * requests on the server.
 */
const createAnonClient = () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iktbpmqahpkboovgbbib.supabase.co'
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_U1bLx1ViEflYjYCCaEJR6w_yTqsN-PK'

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

/**
 * Server-side settings read, shared by `generateMetadata` and the layout's
 * SiteSettingsProvider seed. `cache` keeps it to a single query per request.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const { data, error } = await createAnonClient()
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error || !data) return DEFAULT_SITE_SETTINGS

    return {
      ...DEFAULT_SITE_SETTINGS,
      ...data,
      site_title: String(data.site_title || DEFAULT_SITE_SETTINGS.site_title),
      site_description: String(data.site_description ?? DEFAULT_SITE_SETTINGS.site_description),
      favicon_url:
        typeof data.favicon_url === 'string' && data.favicon_url.trim()
          ? data.favicon_url.trim()
          : null,
      logo_url:
        typeof data.logo_url === 'string' && data.logo_url.trim() ? data.logo_url.trim() : null,
      contact_address:
        typeof data.contact_address === 'string' && data.contact_address.trim()
          ? data.contact_address.trim()
          : DEFAULT_SITE_SETTINGS.contact_address,
      contact_phone:
        typeof data.contact_phone === 'string' && data.contact_phone.trim()
          ? data.contact_phone.trim()
          : DEFAULT_SITE_SETTINGS.contact_phone,
      contact_email:
        typeof data.contact_email === 'string' && data.contact_email.trim()
          ? data.contact_email.trim()
          : DEFAULT_SITE_SETTINGS.contact_email,
    }
  } catch {
    // Settings table not provisioned yet, or Supabase unreachable at build time.
    return DEFAULT_SITE_SETTINGS
  }
})
