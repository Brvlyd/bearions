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
  const [showNotifications, setShowNotifications] = useState(false)

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
    if (pathname.includes('/landing-page')) return 'Landing Page & Categories'
    if (pathname.includes('/users')) return 'User Management'
    if (pathname.includes('/orders')) return 'Orders'
    if (pathname.includes('/monitoring')) return 'Monitoring'
    return t('adminDashboard.overview')
  }

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-linear-to-r from-gray-900 to-gray-800 border-b border-white/10 z-40">
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
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 relative group"
            >
              <Bell className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400 group-hover:text-white transition-all" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center font-bold text-[10px]">
                  {notifications}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifications(false)}
                ></div>
                
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-black">Notifications</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{notifications} new notifications</p>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {/* Mock Notifications */}
                    <div className="divide-y divide-gray-100">
                      <div className="p-4 hover:bg-gray-50 transition cursor-pointer">
                        <div className="flex gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black">New Order #12345</p>
                            <p className="text-xs text-gray-600 mt-1">Customer John placed a new order</p>
                            <p className="text-xs text-gray-400 mt-1">2 minutes ago</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 hover:bg-gray-50 transition cursor-pointer">
                        <div className="flex gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black">Product Stock Low</p>
                            <p className="text-xs text-gray-600 mt-1">Bearion Tees stock is below 10 items</p>
                            <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 hover:bg-gray-50 transition cursor-pointer">
                        <div className="flex gap-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black">New User Registration</p>
                            <p className="text-xs text-gray-600 mt-1">Sarah Johnson just registered</p>
                            <p className="text-xs text-gray-400 mt-1">3 hours ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all as read
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Divider - Hidden on mobile */}
          <div className="hidden sm:block h-8 w-px bg-white/10"></div>

          {/* Admin Profile */}
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-9 lg:h-9 bg-linear-to-br from-white to-gray-200 text-gray-900 flex items-center justify-center font-bold text-sm rounded-full ring-2 ring-white/20 hover:ring-white/40 transition-all duration-200">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-white">
                Hello, {adminName.length > 15 ? adminName.substring(0, 15) + '...' : adminName}
              </p>
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
