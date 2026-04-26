'use client'

import { useEffect, useState } from 'react'
import { Product } from '@/lib/supabase'
import { productService } from '@/lib/products'
import { useLanguage } from '@/lib/i18n'
import { Package, TrendingUp, AlertCircle, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboardPage() {
  const { t, tr } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await productService.getAllProducts()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate analytics
  const totalProducts = products.length
  const inStockProducts = products.filter(p => p.stock > 0).length
  const outOfStockProducts = products.filter(p => p.stock === 0).length
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 10).length

  // Category distribution
  const categoryData = products.reduce((acc, product) => {
    const category = product.category || tr('Uncategorized', 'Tanpa Kategori')
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Stock status distribution
  const stockDistribution = [
    { label: tr('In Stock (>10)', 'Stok Aman (>10)'), count: products.filter(p => p.stock > 10).length, color: 'bg-green-500' },
    { label: tr('Low Stock (1-10)', 'Stok Menipis (1-10)'), count: lowStockProducts, color: 'bg-yellow-500' },
    { label: tr('Out of Stock', 'Stok Habis'), count: outOfStockProducts, color: 'bg-red-500' },
  ]

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        <p className="mt-4 text-gray-600">{tr('Loading analytics...', 'Memuat analitik...')}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 text-black">{t('adminDashboard.overview')}</h2>
        <p className="text-gray-600">{t('adminDashboard.overviewDesc')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{tr('Total Products', 'Total Produk')}</p>
              <p className="text-3xl font-bold text-black">{totalProducts}</p>
            </div>
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{tr('In Stock', 'Stok Tersedia')}</p>
              <p className="text-3xl font-bold text-black">{inStockProducts}</p>
            </div>
            <Package className="w-12 h-12 text-green-400" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{tr('Out of Stock', 'Stok Habis')}</p>
              <p className="text-3xl font-bold text-black">{outOfStockProducts}</p>
            </div>
            <Package className="w-12 h-12 text-red-400" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {/* Stock Distribution Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            {tr('Stock Status Distribution', 'Distribusi Status Stok')}
          </h3>
          <div className="space-y-4">
            {stockDistribution.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="font-semibold text-black">{tr('{count} products', '{count} produk', { count: item.count })}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${item.color} h-3 rounded-full transition-all`}
                    style={{ width: `${totalProducts > 0 ? (item.count / totalProducts) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            {tr('Products by Category', 'Produk per Kategori')}
          </h3>
          <div className="space-y-4">
            {Object.entries(categoryData).map(([category, count], index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700">{category}</span>
                  <span className="font-semibold text-black">{tr('{count} products', '{count} produk', { count })}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{ width: `${totalProducts > 0 ? (count / totalProducts) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Health */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {tr('Inventory Health', 'Kesehatan Inventori')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-700">{tr('In Stock', 'Stok Tersedia')}</span>
              <span className="text-2xl font-bold text-green-700">{inStockProducts}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
              <span className="text-sm text-gray-700">{tr('Low Stock', 'Stok Menipis')}</span>
              <span className="text-2xl font-bold text-yellow-700">{lowStockProducts}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
              <span className="text-sm text-gray-700">{tr('Out of Stock', 'Stok Habis')}</span>
              <span className="text-2xl font-bold text-red-700">{outOfStockProducts}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">{tr('Stock Availability Rate', 'Rasio Ketersediaan Stok')}</span>
              <span className="text-lg font-bold text-black">
                {totalProducts > 0 ? Math.round((inStockProducts / totalProducts) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-black mb-4">{tr('Quick Actions', 'Aksi Cepat')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/dashboard/products"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
          >
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="font-medium text-black">{tr('Manage Products', 'Kelola Produk')}</p>
            <p className="text-sm text-gray-500">{tr('View and edit all products', 'Lihat dan ubah semua produk')}</p>
          </Link>
          <Link
            href="/admin/dashboard/add-product"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
          >
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="font-medium text-black">{tr('Add Product', 'Tambah Produk')}</p>
            <p className="text-sm text-gray-500">{tr('Create new product listing', 'Buat listing produk baru')}</p>
          </Link>
          <Link
            href="/admin/dashboard/products"
            className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition text-center"
          >
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <p className="font-medium text-black">{tr('Low Stock Alert', 'Peringatan Stok Menipis')}</p>
            <p className="text-sm text-gray-600">{tr('{count} items need attention', '{count} item perlu perhatian', { count: lowStockProducts })}</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
