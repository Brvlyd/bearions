'use client'

import Link from "next/link";
import { useLanguage } from '@/lib/i18n'

export default function Home() {
  const { t } = useLanguage()
  
  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Hero Section */}
      <section className="relative min-h-[500px] lg:h-150 bg-white text-black border-b border-gray-200">
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center py-16 lg:py-0">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-4 lg:mb-6 text-black">
              {t('home.hero.title')}
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl mb-6 lg:mb-8 text-gray-700">
              {t('home.hero.subtitle')}
            </p>
            <p className="text-base lg:text-lg mb-6 lg:mb-8 text-gray-600">
              {t('home.hero.subtitle')}
            </p>
            <Link
              href="/catalog"
              className="inline-block bg-black text-white px-6 py-3 lg:px-8 lg:py-4 rounded-lg font-semibold hover:bg-gray-800 transition text-base lg:text-lg"
            >
              {t('home.hero.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-center text-black mb-8 lg:mb-16">{t('home.featured.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 text-black rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                ✨
              </div>
              <h3 className="text-xl font-semibold mb-3 text-black">{t('home.features.quality')}</h3>
              <p className="text-gray-600">
                {t('home.features.qualityDesc')}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 text-black rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                🚚
              </div>
              <h3 className="text-xl font-semibold mb-3 text-black">{t('home.features.shipping')}</h3>
              <p className="text-gray-600">
                {t('home.features.shippingDesc')}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 text-black rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                �
              </div>
              <h3 className="text-xl font-semibold mb-3 text-black">{t('home.features.returns')}</h3>
              <p className="text-gray-600">
                {t('home.features.returnsDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 lg:py-20 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 lg:mb-6 text-black">{t('home.hero.cta')}</h2>
          <p className="text-lg lg:text-xl text-gray-600 mb-6 lg:mb-8">
            {t('home.featured.viewAll')}
          </p>
          <Link
            href="/catalog"
            className="inline-block bg-black text-white px-6 py-3 lg:px-8 lg:py-4 rounded-lg font-semibold hover:bg-gray-800 transition text-base lg:text-lg"
          >
            {t('nav.catalog')}
          </Link>
        </div>
      </section>
    </div>
  );
}
