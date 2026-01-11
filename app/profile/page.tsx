'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'
import Link from 'next/link'

export default function UserProfilePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    if (!confirm(t('nav.logout') + '?')) return
    
    setLoading(true)
    try {
      await authService.logout()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      alert('Failed to logout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-black mb-6">{t('profile.title')}</h1>
          
          <div className="space-y-4 mb-8">
            <p className="text-gray-600">
              {t('profile.personalInfo')}
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              href="/catalog"
              className="flex-1 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition text-center"
            >
              {t('nav.catalog')}
            </Link>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition disabled:bg-gray-400"
            >
              {loading ? t('common.loading') : t('nav.logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
