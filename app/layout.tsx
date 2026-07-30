import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import SiteSettingsProvider from "@/components/SiteSettingsProvider";
import { LanguageProvider } from "@/lib/i18n";
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

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <SiteSettingsProvider initialSettings={settings}>
          <LanguageProvider>
            <Header />
            {children}
          </LanguageProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
