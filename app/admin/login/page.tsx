'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'

export default function AdminLoginPage() {
  const router = useRouter()
  const { tr } = useLanguage()

  useEffect(() => {
    // Redirect ke halaman login utama
    router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
        <p className="text-gray-600">{tr('Redirecting to login...', 'Mengalihkan ke halaman login...')}</p>
      </div>
    </div>
  )
}
