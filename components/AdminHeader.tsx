'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import { LogOut, Bell, Globe, Menu, X, Package, Truck, Users, CreditCard, AlertTriangle } from 'lucide-react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useCallback } from 'react'

type NotificationPriority = 'high' | 'medium' | 'low'
type NotificationCategory = 'order' | 'payment' | 'inventory' | 'user'

interface AdminNotification {
  id: string
  title: string
  description: string
  href: string
  createdAt: string
  priority: NotificationPriority
  category: NotificationCategory
}

interface AdminOrderRow {
  id: string
  order_number: string
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  payment_status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
  created_at: string
}

interface AdminPaymentRow {
  id: string
  order_id: string
  status: 'pending' | 'processing' | 'success' | 'failed' | 'expired' | 'cancelled' | 'refunded'
  payment_proof_url: string | null
  amount: number
  created_at: string
}

interface AdminProductRow {
  id: string
  name: string
  stock: number
  updated_at: string
}

interface AdminUserRow {
  id: string
  full_name: string | null
  email: string
  created_at: string
}

const NOTIFICATION_READ_STORAGE_KEY = 'bearions-admin-notification-read-v1'
const NOTIFICATION_REFRESH_INTERVAL_MS = 60000

const priorityWeight: Record<NotificationPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

const getNotificationIcon = (category: NotificationCategory) => {
  if (category === 'payment') return CreditCard
  if (category === 'inventory') return Package
  if (category === 'user') return Users
  return Truck
}

const getPriorityDotClass = (priority: NotificationPriority) => {
  if (priority === 'high') return 'bg-red-500'
  if (priority === 'medium') return 'bg-yellow-500'
  return 'bg-blue-500'
}

const parseReadNotificationIds = () => {
  if (typeof window === 'undefined') return new Set<string>()

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_READ_STORAGE_KEY)
    if (!raw) return new Set<string>()

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set<string>()

    return new Set(parsed.filter((value): value is string => typeof value === 'string'))
  } catch {
    return new Set<string>()
  }
}

const persistReadNotificationIds = (ids: Set<string>) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(NOTIFICATION_READ_STORAGE_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // no-op
  }
}

export default function AdminHeader({ sidebarOpen, setSidebarOpen }: { sidebarOpen?: boolean, setSidebarOpen?: (open: boolean) => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const { t, tr, language, setLanguage } = useLanguage()
  const [adminName, setAdminName] = useState('Admin')
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set())
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const formatRelativeTime = useCallback((isoDate: string) => {
    const createdAt = new Date(isoDate).getTime()
    const now = Date.now()
    const deltaMs = Math.max(0, now - createdAt)

    const minutes = Math.floor(deltaMs / 60000)
    const hours = Math.floor(deltaMs / 3600000)
    const days = Math.floor(deltaMs / 86400000)

    if (minutes < 1) return tr('just now', 'baru saja')
    if (minutes < 60) {
      return language === 'en' ? `${minutes}m ago` : `${minutes} menit lalu`
    }
    if (hours < 24) {
      return language === 'en' ? `${hours}h ago` : `${hours} jam lalu`
    }

    return language === 'en' ? `${days}d ago` : `${days} hari lalu`
  }, [language, tr])

  const loadAdminInfo = useCallback(async () => {
    try {
      const user = await authService.getCurrentUser()
      if (user?.profile?.full_name) {
        setAdminName(user.profile.full_name)
      }
    } catch (error) {
      console.error('Failed to load admin info:', error)
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true)

      const userWindowIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const [ordersResult, paymentsResult, lowStockProductsResult, newUsersResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, status, payment_status, created_at')
          .order('created_at', { ascending: false })
          .limit(80),
        supabase
          .from('payments')
          .select('id, order_id, status, payment_proof_url, amount, created_at')
          .eq('status', 'processing')
          .not('payment_proof_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('products')
          .select('id, name, stock, updated_at')
          .lte('stock', 5)
          .order('stock', { ascending: true })
          .limit(20),
        supabase
          .from('users')
          .select('id, full_name, email, created_at')
          .gte('created_at', userWindowIso)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      if (ordersResult.error) throw ordersResult.error
      if (paymentsResult.error) throw paymentsResult.error
      if (lowStockProductsResult.error) throw lowStockProductsResult.error
      if (newUsersResult.error) throw newUsersResult.error

      const orders = (ordersResult.data || []) as AdminOrderRow[]
      const payments = (paymentsResult.data || []) as AdminPaymentRow[]
      const lowStockProducts = (lowStockProductsResult.data || []) as AdminProductRow[]
      const newUsers = (newUsersResult.data || []) as AdminUserRow[]

      const orderMap = new Map(orders.map((order) => [order.id, order]))
      const builtNotifications: AdminNotification[] = []

      payments.slice(0, 5).forEach((payment) => {
        const relatedOrder = orderMap.get(payment.order_id)
        const orderNumber = relatedOrder?.order_number || payment.order_id.slice(0, 8)

        builtNotifications.push({
          id: `payment-proof-${payment.id}`,
          title: tr('Payment proof needs verification', 'Bukti pembayaran perlu diverifikasi'),
          description: tr(
            'Order #{orderNumber} is waiting for admin verification.',
            'Pesanan #{orderNumber} menunggu verifikasi admin.',
            { orderNumber }
          ),
          href: '/admin/dashboard/orders',
          createdAt: payment.created_at,
          priority: 'high',
          category: 'payment',
        })
      })

      const readyToShipOrders = orders.filter(
        (order) =>
          order.payment_status === 'paid' &&
          !['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status)
      )

      if (readyToShipOrders.length > 0) {
        builtNotifications.push({
          id: `ready-to-ship-${readyToShipOrders.length}-${readyToShipOrders[0]?.id || 'none'}`,
          title: tr('Orders ready to ship', 'Pesanan siap dikirim'),
          description: tr(
            '{count} paid orders are waiting for shipment.',
            '{count} pesanan sudah dibayar dan menunggu pengiriman.',
            { count: readyToShipOrders.length }
          ),
          href: '/admin/dashboard/orders',
          createdAt: readyToShipOrders[0]?.created_at || new Date().toISOString(),
          priority: 'high',
          category: 'order',
        })
      }

      const outOfStockProducts = lowStockProducts.filter((product) => product.stock === 0)
      outOfStockProducts.slice(0, 3).forEach((product) => {
        builtNotifications.push({
          id: `out-of-stock-${product.id}`,
          title: tr('Product out of stock', 'Produk kehabisan stok'),
          description: tr(
            '{name} is out of stock and needs restocking.',
            '{name} kehabisan stok dan perlu restock.',
            { name: product.name }
          ),
          href: '/admin/dashboard/products',
          createdAt: product.updated_at,
          priority: 'high',
          category: 'inventory',
        })
      })

      const criticalLowStockProducts = lowStockProducts.filter((product) => product.stock > 0 && product.stock <= 3)
      criticalLowStockProducts.slice(0, 3).forEach((product) => {
        builtNotifications.push({
          id: `low-stock-${product.id}-${product.stock}`,
          title: tr('Stock running low', 'Stok menipis'),
          description: tr(
            '{name} only has {stock} items left.',
            '{name} tinggal {stock} item.',
            { name: product.name, stock: product.stock }
          ),
          href: '/admin/dashboard/products',
          createdAt: product.updated_at,
          priority: 'medium',
          category: 'inventory',
        })
      })

      if (newUsers.length > 0) {
        const latestUser = newUsers[0]
        const latestUserName = latestUser?.full_name || latestUser?.email || tr('New user', 'Pengguna baru')

        builtNotifications.push({
          id: `new-users-${newUsers.length}-${latestUser?.id || 'none'}`,
          title: tr('New users registered', 'Pengguna baru terdaftar'),
          description: tr(
            '{count} new users in the last 24 hours. Latest: {name}.',
            '{count} pengguna baru dalam 24 jam terakhir. Terbaru: {name}.',
            { count: newUsers.length, name: latestUserName }
          ),
          href: '/admin/dashboard/users',
          createdAt: latestUser?.created_at || new Date().toISOString(),
          priority: 'low',
          category: 'user',
        })
      }

      builtNotifications.sort((a, b) => {
        const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      setNotifications(builtNotifications)
    } catch (error) {
      console.error('Failed to load admin notifications:', error)
    } finally {
      setLoadingNotifications(false)
    }
  }, [tr])

  const markAllNotificationsAsRead = useCallback(() => {
    const ids = new Set(notifications.map((notification) => notification.id))
    setReadNotificationIds(ids)
    persistReadNotificationIds(ids)
  }, [notifications])

  const markNotificationAsRead = useCallback((id: string) => {
    setReadNotificationIds((previousIds) => {
      const nextIds = new Set(previousIds)
      nextIds.add(id)
      persistReadNotificationIds(nextIds)
      return nextIds
    })
  }, [])

  useEffect(() => {
    setReadNotificationIds(parseReadNotificationIds())
    loadAdminInfo()
    loadNotifications()

    const intervalId = window.setInterval(() => {
      loadNotifications()
    }, NOTIFICATION_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [loadAdminInfo, loadNotifications])

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

  const unreadNotifications = notifications.filter((notification) => !readNotificationIds.has(notification.id))
  const unreadCount = unreadNotifications.length

  const getPageTitle = () => {
    if (pathname.includes('/add-product')) return t('admin.addProduct')
    if (pathname.includes('/edit-product')) return t('admin.editProduct')
    if (pathname.includes('/products')) return t('adminProducts.title')
    if (pathname.includes('/landing-page')) return tr('Landing Page & Categories', 'Landing Page & Kategori')
    if (pathname.includes('/users')) return tr('User Management', 'Manajemen Pengguna')
    if (pathname.includes('/orders')) return tr('Orders', 'Pesanan')
    if (pathname.includes('/monitoring')) return tr('Monitoring', 'Monitoring')
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
            title={language === 'en' ? tr('Switch to Indonesian', 'Ganti ke Bahasa Indonesia') : tr('Switch to English', 'Ganti ke English')}
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
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center font-bold text-[10px]">
                  {unreadCount > 9 ? '9+' : unreadCount}
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
                    <h3 className="font-semibold text-black">{tr('Notifications', 'Notifikasi')}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {unreadCount} {tr('need attention', 'perlu perhatian')}
                    </p>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="p-6 text-center text-sm text-gray-500">
                        {tr('Loading notifications...', 'Memuat notifikasi...')}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500">
                        {tr('No urgent notifications right now.', 'Belum ada notifikasi penting saat ini.')}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => {
                          const Icon = getNotificationIcon(notification.category)
                          const isUnread = !readNotificationIds.has(notification.id)

                          return (
                            <Link
                              key={notification.id}
                              href={notification.href}
                              onClick={() => {
                                markNotificationAsRead(notification.id)
                                setShowNotifications(false)
                              }}
                              className={`block p-4 transition ${isUnread ? 'bg-blue-50/30 hover:bg-blue-50/60' : 'hover:bg-gray-50'}`}
                            >
                              <div className="flex gap-3">
                                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${getPriorityDotClass(notification.priority)}`}></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-black flex items-center gap-2">
                                    <Icon className="w-3.5 h-3.5 text-gray-500" />
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">{notification.description}</p>
                                  <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.createdAt)}</p>
                                </div>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
                    <button
                      onClick={() => {
                        markAllNotificationsAsRead()
                        setShowNotifications(false)
                      }}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {tr('Mark all as read', 'Tandai semua sudah dibaca')}
                    </button>
                    <button
                      onClick={() => {
                        loadNotifications()
                      }}
                      className="w-full text-center text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      {tr('Refresh notifications', 'Muat ulang notifikasi')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Priority hint */}
          {unreadCount > 0 && (
            <div className="hidden xl:flex items-center gap-2 px-2 py-1 rounded-md bg-red-500/10 text-red-300 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{tr('{count} urgent items', '{count} item penting', { count: unreadCount })}</span>
            </div>
          )}

          {/* Divider - Hidden on mobile */}
          <div className="hidden sm:block h-8 w-px bg-white/10"></div>

          {/* Admin Profile */}
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-9 lg:h-9 bg-linear-to-br from-white to-gray-200 text-gray-900 flex items-center justify-center font-bold text-sm rounded-full ring-2 ring-white/20 hover:ring-white/40 transition-all duration-200">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-white">
                {tr('Hello', 'Halo')}, {adminName.length > 15 ? adminName.substring(0, 15) + '...' : adminName}
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
