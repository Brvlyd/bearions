'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import { LogOut, Bell, Globe } from 'lucide-react'
import { authService } from '@/lib/auth'
import { useState, useEffect } from 'react'

export default function AdminHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { t, language, setLanguage } = useLanguage()
  const [adminName, setAdminName] = useState('Admin')
  const [notifications, setNotifications] = useState(3) // Mock notifications

  useEffect(() => {
    loadAdminInfo()
  }, [])

  const loadAdminInfo = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (user?.profile?.full_name) {
        setAdminName(user.profile.full_name)
      }
    } catch (error) {
      console.error('Failed to load admin info:', error)
    }
  }

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'id' : 'en')
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const getPageTitle = () => {
    if (pathname.includes('/add-product')) return t('admin.addProduct')
    if (pathname.includes('/edit-product')) return t('admin.editProduct')
    if (pathname.includes('/products')) return t('adminProducts.title')
    if (pathname.includes('/monitoring')) return 'Monitoring'
    return t('adminDashboard.overview')
  }

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-white/10 z-40">
      <div className="h-full px-8 flex items-center justify-between">
        {/* Left: Page Title */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">{getPageTitle()}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-0.5">
              <Link href="/admin/dashboard" className="hover:text-white transition">
                {t('adminSidebar.adminPanel')}
              </Link>
              <span>/</span>
              <span className="text-gray-300">{getPageTitle().split(' ')[0]}</span>
            </div>
          </div>
        </div>

        {/* Right: Simple Controls */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <button
            onClick={toggleLanguage}
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 group flex items-center gap-2"
            title={language === 'en' ? 'Switch to Indonesian' : 'Ganti ke English'}
          >
            <Globe className="w-4 h-4 text-gray-400 group-hover:text-white transition-all" />
            <span className="text-sm font-medium text-gray-400 group-hover:text-white">
              {language === 'en' ? 'EN' : 'ID'}
            </span>
          </button>

          {/* Notifications */}
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 relative group">
            <Bell className="w-5 h-5 text-gray-400 group-hover:text-white transition-all" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {notifications}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-white/10"></div>

          {/* Admin Profile */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-white to-gray-200 text-gray-900 flex items-center justify-center font-bold text-sm rounded-full ring-2 ring-white/20 hover:ring-white/40 transition-all duration-200">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-white">{adminName}</p>
              <p className="text-xs text-gray-400">{t('admin.administrator')}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all duration-200 group"
            title={t('admin.logout')}
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span className="hidden lg:inline text-sm font-medium">{t('admin.logout')}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
