'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authService } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { tr } = useLanguage()
  // The login page is public, so it is never "verifying". Deriving this from
  // the route instead of resetting a flag in an effect is what stops the
  // spinner sticking forever when the guard redirects us here.
  const isLoginRoute = pathname === '/admin/login'
  const [verifying, setVerifying] = useState(true)
  const loading = !isLoginRoute && verifying

  const checkAuth = async () => {
    try {
      const isAdmin = await authService.isAdmin()

      if (!isAdmin) {
        router.push('/admin/login')
        return
      }

      setVerifying(false)
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/admin/login')
    }
  }

  useEffect(() => {
    if (isLoginRoute) return
    // setVerifying only runs after an await inside checkAuth, so nothing is
    // set synchronously here; the compiler cannot see past the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth()
  }, [pathname])

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
