'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { Package, PlusCircle, BarChart3, TrendingUp, Users, ShoppingCart } from 'lucide-react'
import AdminHeader from '@/components/AdminHeader'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const admin = await authService.isAdmin()
      if (!admin) {
        router.push('/admin/login')
      } else {
        setIsAdmin(true)
      }
    } catch (error) {
      router.push('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  const isActiveRoute = (route: string) => {
    return pathname === route
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="mt-4">{t('admin.verifyingAccess')}</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Admin Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white shadow-2xl z-50">
        {/* Logo Section */}
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-white text-black flex items-center justify-center font-bold text-xl rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-lg">
              B
            </div>
            <div>
              <span className="text-xl font-bold block transition-all duration-300 group-hover:text-gray-300">BEARIONS</span>
              <span className="text-xs text-gray-400">{t('adminSidebar.adminPanel')}</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t('adminSidebar.mainMenu')}
          </p>
          
          <Link
            href="/admin/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
              isActiveRoute('/admin/dashboard')
                ? 'bg-white/10 text-white shadow-lg'
                : 'hover:bg-white/5 text-gray-300 hover:text-white'
            }`}
          >
            {isActiveRoute('/admin/dashboard') && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></span>
            )}
            <BarChart3 className={`w-5 h-5 transition-all duration-200 ${
              isActiveRoute('/admin/dashboard') ? 'scale-110' : 'group-hover:scale-110'
            }`} />
            <span className="font-medium">{t('adminSidebar.dashboard')}</span>
          </Link>

          <Link
            href="/admin/dashboard/products"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
              isActiveRoute('/admin/dashboard/products')
                ? 'bg-white/10 text-white shadow-lg'
                : 'hover:bg-white/5 text-gray-300 hover:text-white'
            }`}
          >
            {isActiveRoute('/admin/dashboard/products') && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></span>
            )}
            <Package className={`w-5 h-5 transition-all duration-200 ${
              isActiveRoute('/admin/dashboard/products') ? 'scale-110' : 'group-hover:scale-110'
            }`} />
            <span className="font-medium">{t('adminSidebar.products')}</span>
          </Link>

          <Link
            href="/admin/dashboard/add-product"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
              isActiveRoute('/admin/dashboard/add-product')
                ? 'bg-white/10 text-white shadow-lg'
                : 'hover:bg-white/5 text-gray-300 hover:text-white'
            }`}
          >
            {isActiveRoute('/admin/dashboard/add-product') && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></span>
            )}
            <PlusCircle className={`w-5 h-5 transition-all duration-200 ${
              isActiveRoute('/admin/dashboard/add-product') ? 'scale-110' : 'group-hover:scale-110'
            }`} />
            <span className="font-medium">{t('adminSidebar.addProduct')}</span>
          </Link>

          {/* Quick Stats Section */}
          <div className="pt-6">
            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('adminSidebar.quickStats')}
            </p>
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{t('adminDashboard.totalProducts')}</span>
                <span className="font-bold text-white">--</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{t('adminSidebar.ordersToday')}</span>
                <span className="font-bold text-green-400">--</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{t('adminSidebar.revenue')}</span>
                <span className="font-bold text-blue-400">--</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 group"
          >
            <span className="text-sm font-medium">{t('adminSidebar.viewStore')}</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </aside>

      {/* Admin Header */}
      <AdminHeader />

      {/* Main Content */}
      <div className="ml-64 pt-16">
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
