import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import SiteSettingsProvider from "@/components/SiteSettingsProvider";
import CategoryProvider from "@/components/CategoryProvider";
import { LanguageProvider } from "@/lib/i18n";
import { DialogProvider } from "@/lib/dialog";
import { resolveFaviconLink } from "@/lib/site-settings";
import { getSiteSettings } from "@/lib/site-settings-server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const favicon = resolveFaviconLink(settings.favicon_url);

  return {
    title: settings.site_title,
    description: settings.site_description,
    icons: {
      icon: [{ url: favicon.href, type: favicon.type }],
      shortcut: [{ url: favicon.href, type: favicon.type }],
      apple: [{ url: favicon.href }],
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

  // Tells search engines what this store is and where it is. Only what the
  // CMS actually holds is emitted — a half-filled address is worse than none.
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: settings.site_title.split(' - ')[0],
    description: settings.site_description,
    ...(settings.contact_address && {
      address: { '@type': 'PostalAddress', streetAddress: settings.contact_address },
    }),
    ...(settings.contact_phone && { telephone: settings.contact_phone }),
    ...(settings.contact_email && { email: settings.contact_email }),
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
