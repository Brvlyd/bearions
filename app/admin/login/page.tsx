'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AdminLoginPage() {
  const router = useRouter()
  const { tr } = useLanguage()

  useEffect(() => {
    // Redirect ke halaman login utama
    router.push('/login')
  }, [router])

  return <LoadingSpinner fullScreen label={tr('Redirecting to login...', 'Mengalihkan ke halaman login...')} />
}
