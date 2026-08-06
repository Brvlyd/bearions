import type { MetadataRoute } from 'next'
import { getPublicSiteOrigin } from '@/lib/site-url'

/**
 * Serves /robots.txt. Without one, a crawler has no pointer to the sitemap and
 * happily indexes the account-only pages, which are useless in a search result
 * and dilute the store pages that matter.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Signed-in surfaces and endpoints: nothing here renders for a crawler.
        disallow: ['/admin', '/api/', '/cart', '/checkout', '/orders', '/payment', '/profile', '/auth/'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
