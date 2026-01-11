'use client'

import { useLanguage } from '@/lib/i18n'

export default function CommunityPage() {
  const { t } = useLanguage()
  
  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold mb-8 text-black">{t('community.title')}</h1>
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-xl text-gray-600">
            {t('community.description')}
          </p>
          <p className="mt-4 text-gray-500">
            {t('community.subtitle')}
          </p>
        </div>
      </div>
    </div>
  )
}
