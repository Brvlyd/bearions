import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getPublicSiteOrigin } from '@/lib/site-url'

/**
 * Serves /sitemap.xml: the public pages plus one entry per product. This is how
 * a search engine finds out a product page exists at all — the catalog renders
 * its links on the client, so there is nothing in the HTML for a crawler to
 * follow — and how it learns the pages changed without waiting for a re-crawl.
 *
 * Rebuilt hourly rather than per request; a sitemap that is an hour stale costs
 * nothing, a database round trip on every crawler hit does.
 */
export const revalidate = 3600

const STATIC_ROUTES = ['', '/catalog', '/community', '/about', '/contact'] as const

/** Session-less read, same reasoning as lib/site-settings-server.ts. */
const createAnonClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iktbpmqahpkboovgbbib.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_U1bLx1ViEflYjYCCaEJR6w_yTqsN-PK',
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getPublicSiteOrigin()
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${origin}${route || '/'}`,
    lastModified: now,
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))

  try {
    const { data, error } = await createAnonClient()
      .from('products')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(2000)

    if (error || !data) return staticEntries

    return [
      ...staticEntries,
      ...data.map((product) => ({
        url: `${origin}/products/${product.id}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ]
  } catch {
    // Supabase unreachable at build time: a sitemap of the static pages is
    // still worth serving.
    return staticEntries
  }
}
