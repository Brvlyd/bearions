'use client'

import { useEffect, useState } from 'react'
import { Product } from '@/lib/supabase'
import { productService } from '@/lib/products'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, Package, AlertCircle } from 'lucide-react'

export default function MonitoringPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'low-stock' | 'out-of-stock'>('all')

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const getFilteredProducts = () => {
    switch (filter) {
      case 'low-stock':
        return products.filter(p => p.stock > 0 && p.stock <= 10)
      case 'out-of-stock':
        return products.filter(p => p.stock === 0)
      default:
        return products
    }
  }

  const filteredProducts = getFilteredProducts()
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 10).length
  const outOfStockCount = products.filter(p => p.stock === 0).length

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        <p className="mt-4 text-gray-600">Loading products...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 text-black">Product Management</h2>
        <p className="text-gray-600">Manage product availability, stock levels, and images</p>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Products</p>
              <p className="text-3xl font-bold text-black">{products.length}</p>
            </div>
            <Package className="w-12 h-12 text-blue-400" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-yellow-200 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Low Stock (≤10)</p>
              <p className="text-3xl font-bold text-yellow-700">{lowStockCount}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Out of Stock</p>
              <p className="text-3xl font-bold text-red-700">{outOfStockCount}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'all'
              ? 'bg-black text-white'
              : 'bg-white border border-gray-200 text-black hover:bg-gray-50'
          }`}
        >
          All Products ({products.length})
        </button>
        <button
          onClick={() => setFilter('low-stock')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'low-stock'
              ? 'bg-yellow-500 text-white'
              : 'bg-white border border-gray-200 text-black hover:bg-gray-50'
          }`}
        >
          Low Stock ({lowStockCount})
        </button>
        <button
          onClick={() => setFilter('out-of-stock')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'out-of-stock'
              ? 'bg-red-500 text-white'
              : 'bg-white border border-gray-200 text-black hover:bg-gray-50'
          }`}
        >
          Out of Stock ({outOfStockCount})
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition">
            {/* Product Image */}
            <div className="aspect-square bg-gray-50 relative">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Package className="w-16 h-16" />
                </div>
              )}
              {/* Stock Badge */}
              <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-semibold ${
                product.stock === 0
                  ? 'bg-red-500 text-white'
                  : product.stock <= 10
                  ? 'bg-yellow-500 text-white'
                  : 'bg-green-500 text-white'
              }`}>
                {product.stock === 0 ? 'Out' : product.stock <= 10 ? 'Low' : 'In Stock'}
              </div>
            </div>

            {/* Product Info */}
            <div className="p-4">
              <h3 className="font-semibold text-black mb-1 truncate">{product.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{product.category}</p>
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-bold text-black">{formatPrice(product.price)}</span>
                <span className={`text-sm font-medium ${
                  product.stock === 0
                    ? 'text-red-600'
                    : product.stock <= 10
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}>
                  Stock: {product.stock}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Link
                  href={`/products/${product.id}`}
                  target="_blank"
                  className="flex-1 bg-gray-100 text-black px-3 py-2 rounded text-sm font-medium hover:bg-gray-200 transition text-center flex items-center justify-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Link>
                <Link
                  href={`/admin/dashboard/edit-product/${product.id}`}
                  className="flex-1 bg-black text-white px-3 py-2 rounded text-sm font-medium hover:bg-gray-800 transition text-center"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No products found in this category.
        </div>
      )}
    </div>
  )
}
