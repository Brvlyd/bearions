'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { tr } = useLanguage()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const isAdmin = await authService.isAdmin()
      
      if (!isAdmin) {
        router.push('/admin/login')
        return
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/admin/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
          <p className="text-gray-600">{tr('Verifying access...', 'Memverifikasi akses...')}</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
