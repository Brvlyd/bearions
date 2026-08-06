import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import SiteSettingsProvider from "@/components/SiteSettingsProvider";
import CategoryProvider from "@/components/CategoryProvider";
import { LanguageProvider } from "@/lib/i18n";
import { DialogProvider } from "@/lib/dialog";
import { getSiteName, resolveFaviconLink, resolveLogoUrl } from "@/lib/site-settings";
import { getSiteSettings } from "@/lib/site-settings-server";
import { getPublicSiteOrigin } from "@/lib/site-url";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

/**
 * The storefront pages are prerendered, so without this the title, description
 * and icon in the served HTML would be frozen at build time and a CMS edit
 * would only reach a crawler after the next deploy. Visitors already see the
 * change immediately (SiteSettingsProvider re-reads it on the client); this is
 * what puts it in the HTML itself, within the hour.
 */
export const revalidate = 3600;

// Everything a search result or a shared link shows — name, title, description,
// icon, preview image — comes from Admin > Site Settings, so the client can
// change it without a deploy. Google re-reads it on its own schedule, which is
// why robots.ts and sitemap.ts exist next to this file.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const favicon = resolveFaviconLink(settings.favicon_url);
  const origin = getPublicSiteOrigin();
  const siteName = getSiteName(settings.site_title);
  // No dedicated share image in the CMS: the logo is the one brand asset that
  // is always set, and it is what a link preview should show anyway.
  const shareImage = resolveLogoUrl(settings.logo_url, settings.updated_at);

  return {
    metadataBase: new URL(origin),
    title: settings.site_title,
    description: settings.site_description,
    applicationName: siteName,
    alternates: { canonical: "/" },
    icons: {
      icon: [{ url: favicon.href, type: favicon.type }],
      shortcut: [{ url: favicon.href, type: favicon.type }],
      apple: [{ url: favicon.href }],
    },
    openGraph: {
      type: "website",
      url: origin,
      siteName,
      title: settings.site_title,
      description: settings.site_description,
      images: [{ url: shareImage, alt: siteName }],
    },
    twitter: {
      // 'summary', not 'summary_large_image': the share image is the logo, and
      // a wide card would crop a near-square mark to a letterbox strip.
      card: "summary",
      title: settings.site_title,
      description: settings.site_description,
      images: [shareImage],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Seeded into the provider so the navbar logo is already correct on first
  // paint instead of swapping in after the client fetch resolves.
  const settings = await getSiteSettings();

  const origin = getPublicSiteOrigin();
  const siteName = getSiteName(settings.site_title);

  // Tells search engines what this store is and where it is. Only what the
  // CMS actually holds is emitted — a half-filled address is worse than none.
  // The WebSite entry is what Google reads for the site name it prints above
  // the result title; without it, it guesses from the domain.
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: `${origin}/`,
        name: siteName,
        description: settings.site_description,
      },
      {
        '@type': 'ClothingStore',
        '@id': `${origin}/#store`,
        url: `${origin}/`,
        name: siteName,
        description: settings.site_description,
        image: new URL(resolveLogoUrl(settings.logo_url), origin).toString(),
        ...(settings.contact_address && {
          address: { '@type': 'PostalAddress', streetAddress: settings.contact_address },
        }),
        ...(settings.contact_phone && { telephone: settings.contact_phone }),
        ...(settings.contact_email && { email: settings.contact_email }),
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <SiteSettingsProvider initialSettings={settings}>
          <LanguageProvider>
            <DialogProvider>
              <CategoryProvider>
                <Header />
                {children}
              </CategoryProvider>
            </DialogProvider>
          </LanguageProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
