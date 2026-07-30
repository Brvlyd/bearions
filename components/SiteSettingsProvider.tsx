'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { SiteSettings, supabase } from '@/lib/supabase'
import { DEFAULT_SITE_SETTINGS, loadSiteSettings, resolveFaviconLink } from '@/lib/site-settings'

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

const SiteSettingsContext = createContext<SiteSettings>(DEFAULT_SITE_SETTINGS)

/** Reads the live site settings (tab title, favicon, navbar logo). */
export const useSiteSettings = () => useContext(SiteSettingsContext)

/**
 * Holds the admin-configured site settings for the whole tree and applies the
 * tab title and favicon on the client. The server already renders those into
 * the initial HTML via `generateMetadata`, and seeds `initialSettings` here so
 * the navbar logo is correct on first paint; this keeps statically prerendered
 * pages current and reacts to admin edits without a reload.
 */
export default function SiteSettingsProvider({
  initialSettings,
  children,
}: {
  initialSettings?: SiteSettings
  children: React.ReactNode
}) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings || DEFAULT_SITE_SETTINGS)

  useEffect(() => {
    let isMounted = true

    const apply = async () => {
      const { data, tableMissing } = await loadSiteSettings()
      if (!isMounted || tableMissing) return

      setSettings(data)
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

  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>
}
