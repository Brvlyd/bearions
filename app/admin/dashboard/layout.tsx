'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { LogOut, Package, PlusCircle, BarChart3 } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
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

  const handleLogout = async () => {
    try {
      await authService.logout()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="mt-4">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-black text-white">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-bold text-xl rounded">
              B
            </div>
            <span className="text-xl font-bold">BEARIONS</span>
          </div>

          <nav className="space-y-2">
            <Link
              href="/admin/dashboard"
              className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/10 transition"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
            </Link>
            <Link
              href="/admin/dashboard/products"
              className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/10 transition"
            >
              <Package className="w-5 h-5" />
              <span>Products</span>
            </Link>
            <Link
              href="/admin/dashboard/add-product"
              className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/10 transition"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Add Product</span>
            </Link>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/10 transition w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <h1 className="text-2xl text-black font-bold">Admin Dashboard</h1>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
