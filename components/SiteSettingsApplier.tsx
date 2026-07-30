'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { loadSiteSettings, resolveFaviconLink } from '@/lib/site-settings'

const FAVICON_LINK_ID = 'site-settings-favicon'
const ICON_LINK_SELECTOR = 'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'

const applyFavicon = (faviconUrl: string | null, version: string) => {
  const { href, type } = resolveFaviconLink(faviconUrl)

  // Remote icons are versioned so a replaced favicon is refetched, while the
  // URL stays stable between renders (avoids re-downloading on every mount).
  let resolvedHref = href
  if (!href.startsWith('/') && version) {
    const separator = href.includes('?') ? '&' : '?'
    resolvedHref = `${href}${separator}v=${encodeURIComponent(version)}`
  }

  // Update the icon links Next.js rendered from `generateMetadata` in place
  // rather than removing them, so React's head reconciliation stays intact.
  const existing = Array.from(document.querySelectorAll<HTMLLinkElement>(ICON_LINK_SELECTOR))

  if (existing.length === 0) {
    const link = document.createElement('link')
    link.id = FAVICON_LINK_ID
    link.rel = 'icon'
    document.head.appendChild(link)
    existing.push(link)
  }

  existing.forEach((link) => {
    if (link.getAttribute('href') !== resolvedHref) link.setAttribute('href', resolvedHref)

    // Apple touch icons are sized bitmaps; leave their type hint alone.
    if (link.rel === 'apple-touch-icon') return

    if (type) {
      link.setAttribute('type', type)
    } else {
      link.removeAttribute('type')
    }
  })
}

/**
 * Applies the admin-configured tab title and favicon on the client. The server
 * already renders them into the initial HTML via `generateMetadata`; this keeps
 * statically prerendered pages current and reacts to admin edits without a reload.
 */
export default function SiteSettingsApplier() {
  useEffect(() => {
    let isMounted = true

    const apply = async () => {
      const { data, tableMissing } = await loadSiteSettings()
      if (!isMounted || tableMissing) return

      if (data.site_title) document.title = data.site_title
      applyFavicon(data.favicon_url, data.updated_at)
    }

    apply()

    const channel = supabase
      .channel('site-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_settings',
        },
        () => {
          if (isMounted) apply()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return null
}
