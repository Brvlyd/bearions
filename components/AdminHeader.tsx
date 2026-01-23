'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import { LogOut, Bell, Globe, Menu, X } from 'lucide-react'
import { authService } from '@/lib/auth'
import { useState, useEffect } from 'react'

export default function AdminHeader({ sidebarOpen, setSidebarOpen }: { sidebarOpen?: boolean, setSidebarOpen?: (open: boolean) => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const { t, language, setLanguage } = useLanguage()
  const [adminName, setAdminName] = useState('Admin')
  const [notifications, setNotifications] = useState(3) // Mock notifications
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-white/10 z-40">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between">
        {/* Left: Page Title */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen && setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div>
            <h1 className="text-base lg:text-xl font-bold text-white">{getPageTitle()}</h1>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-400 mt-0.5">
              <Link href="/admin/dashboard" className="hover:text-white transition">
                {t('adminSidebar.adminPanel')}
              </Link>
              <span>/</span>
              <span className="text-gray-300">{getPageTitle().split(' ')[0]}</span>
            </div>
          </div>
        </div>

        {/* Right: Simple Controls */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Language Selector - Hidden on mobile */}
          <button
            onClick={toggleLanguage}
            className="hidden sm:flex px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 group items-center gap-2"
            title={language === 'en' ? 'Switch to Indonesian' : 'Ganti ke English'}
          >
            <Globe className="w-4 h-4 text-gray-400 group-hover:text-white transition-all" />
            <span className="text-sm font-medium text-gray-400 group-hover:text-white">
              {language === 'en' ? 'EN' : 'ID'}
            </span>
          </button>

          {/* Notifications */}
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 relative group">
            <Bell className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400 group-hover:text-white transition-all" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center font-bold text-[10px]">
                {notifications}
              </span>
            )}
          </button>

          {/* Divider - Hidden on mobile */}
          <div className="hidden sm:block h-8 w-px bg-white/10"></div>

          {/* Admin Profile */}
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-9 lg:h-9 bg-gradient-to-br from-white to-gray-200 text-gray-900 flex items-center justify-center font-bold text-sm rounded-full ring-2 ring-white/20 hover:ring-white/40 transition-all duration-200">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-white">{adminName}</p>
              <p className="text-xs text-gray-400">{t('admin.administrator')}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all duration-200 group"
            title={t('admin.logout')}
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span className="hidden xl:inline text-sm font-medium">{t('admin.logout')}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
