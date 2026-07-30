import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import SiteSettingsApplier from "@/components/SiteSettingsApplier";
import { LanguageProvider } from "@/lib/i18n";
import { resolveFaviconLink } from "@/lib/site-settings";
import { getSiteSettingsForMetadata } from "@/lib/site-settings-server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettingsForMetadata();
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <SiteSettingsApplier />
        <LanguageProvider>
          <Header />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
