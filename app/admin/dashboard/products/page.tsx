'use client'

import { useEffect, useState } from 'react'
import { Product } from '@/lib/supabase'
import { productService } from '@/lib/products'
import { useLanguage } from '@/lib/i18n'
import SafeImage from '@/components/SafeImage'
import Link from 'next/link'
import { Eye, Package, AlertCircle, Search, SlidersHorizontal, Grid, List, Pencil, Trash2, Filter, PlusCircle } from 'lucide-react'

type ViewMode = 'tiles' | 'content'
type SortOption = 'name-asc' | 'name-desc' | 'newest' | 'oldest' | 'stock-high' | 'stock-low'

export default function MonitoringPage() {
  const { t, tr } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('tiles')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  const handleDelete = async (id: string) => {
    setProductToDelete(id)
    setShowDeleteModal(true)
    setDeleteError(null)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return

    try {
      await productService.deleteProduct(productToDelete)
      setProducts(products.filter(p => p.id !== productToDelete))
      setShowDeleteModal(false)
      setProductToDelete(null)
      setDeleteError(null)
    } catch (error) {
      console.error('Error deleting product:', error)
      setDeleteError(t('adminProducts.deleteError'))
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setProductToDelete(null)
    setDeleteError(null)
  }

  const getFilteredProducts = () => {
    let filtered = [...products]

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    switch (sortBy) {
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
        break
      case 'stock-high':
        filtered.sort((a, b) => b.stock - a.stock)
        break
      case 'stock-low':
        filtered.sort((a, b) => a.stock - b.stock)
        break
    }

    return filtered
  }

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

  const filteredProducts = getFilteredProducts()
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 10).length
  const outOfStockCount = products.filter(p => p.stock === 0).length

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        <p className="mt-4 text-gray-600">{tr('Loading products...', 'Memuat produk...')}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-black">{tr('Product Management', 'Manajemen Produk')}</h2>
          <p className="text-gray-600">{tr('Manage product availability, stock levels, and images', 'Kelola ketersediaan produk, level stok, dan gambar')}</p>
        </div>
        <Link
          href="/admin/dashboard/add-product"
          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          <PlusCircle className="w-5 h-5" />
          {tr('Add Product', 'Tambah Produk')}
        </Link>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{tr('Total Products', 'Total Produk')}</p>
              <p className="text-3xl font-bold text-black">{products.length}</p>
            </div>
            <Package className="w-12 h-12 text-blue-400" />
          </div>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{tr('Low Stock (<=10)', 'Stok Menipis (<=10)')}</p>
              <p className="text-3xl font-bold text-yellow-700">{lowStockCount}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-yellow-500" />
          </div>
        </div>
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{tr('Out of Stock', 'Stok Habis')}</p>
              <p className="text-3xl font-bold text-red-700">{outOfStockCount}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={tr('Search products by name, category, or description...', 'Cari produk berdasarkan nama, kategori, atau deskripsi...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-gray-600"
          />
        </div>

        {/* Category Filter Button */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="p-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 btn-animate-bounce"
            title={tr('Filter by Category', 'Filter Kategori')}
          >
            <Filter className="w-5 h-5" />
          </button>
          
          {showCategoryFilter && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-500 px-2 py-1">{tr('FILTER BY CATEGORY', 'FILTER KATEGORI')}</p>
                <button
                  onClick={() => { setCategoryFilter('all'); setShowCategoryFilter(false) }}
                  className={`w-full text-left px-3 py-2 rounded btn-animate ${categoryFilter === 'all' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-100'}`}
                >
                  {tr('All Categories', 'Semua Kategori')}
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => { setCategoryFilter(category); setShowCategoryFilter(false) }}
                    className={`w-full text-left px-3 py-2 rounded btn-animate ${categoryFilter === category ? 'bg-gray-100 font-medium' : 'hover:bg-gray-100'}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sort By Button */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition flex items-center gap-2"
          >
            <SlidersHorizontal className="w-5 h-5" />
            {tr('Sort By', 'Urutkan')}
          </button>
          
          {showSortMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="p-2">
                <button
                  onClick={() => { setSortBy('name-asc'); setShowSortMenu(false) }}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${sortBy === 'name-asc' ? 'bg-gray-100 font-medium' : ''}`}
                >
                  {tr('Name (A - Z)', 'Nama (A - Z)')}
                </button>
                <button
                  onClick={() => { setSortBy('name-desc'); setShowSortMenu(false) }}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${sortBy === 'name-desc' ? 'bg-gray-100 font-medium' : ''}`}
                >
                  {tr('Name (Z - A)', 'Nama (Z - A)')}
                </button>
                <button
                  onClick={() => { setSortBy('newest'); setShowSortMenu(false) }}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${sortBy === 'newest' ? 'bg-gray-100 font-medium' : ''}`}
                >
                  {tr('Newest First', 'Terbaru')}
                </button>
                <button
                  onClick={() => { setSortBy('oldest'); setShowSortMenu(false) }}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${sortBy === 'oldest' ? 'bg-gray-100 font-medium' : ''}`}
                >
                  {tr('Oldest First', 'Terlama')}
                </button>
                <button
                  onClick={() => { setSortBy('stock-high'); setShowSortMenu(false) }}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${sortBy === 'stock-high' ? 'bg-gray-100 font-medium' : ''}`}
                >
                  {tr('Stock (High to Low)', 'Stok (Tinggi ke Rendah)')}
                </button>
                <button
                  onClick={() => { setSortBy('stock-low'); setShowSortMenu(false) }}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${sortBy === 'stock-low' ? 'bg-gray-100 font-medium' : ''}`}
                >
                  {tr('Stock (Low to High)', 'Stok (Rendah ke Tinggi)')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('tiles')}
            className={`p-3 border border-gray-200 rounded-lg transition ${
              viewMode === 'tiles' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
            }`}
            title={tr('Tiles View', 'Tampilan Tile')}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('content')}
            className={`p-3 border border-gray-200 rounded-lg transition ${
              viewMode === 'content' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
            }`}
            title={tr('Content View', 'Tampilan Konten')}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Products Display */}
      {viewMode === 'tiles' ? (
        /* Tiles View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition">
              {/* Product Image */}
              <div className="aspect-square bg-gray-50 relative">
                {product.image_url ? (
                  <SafeImage
                    src={product.image_url}
                    alt={product.name}
                    fill
                    category={product.category}
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
                  {product.stock === 0 ? tr('Out', 'Habis') : product.stock <= 10 ? tr('Low', 'Sedikit') : tr('In Stock', 'Tersedia')}
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
                    {tr('Stock', 'Stok')}: {product.stock}
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
                    {tr('View', 'Lihat')}
                  </Link>
                  <Link
                    href={`/admin/dashboard/edit-product/${product.id}`}
                    className="flex-1 bg-black text-white px-3 py-2 rounded text-sm font-medium hover:bg-gray-800 transition text-center flex items-center justify-center gap-1"
                  >
                    <Pencil className="w-4 h-4" />
                    {tr('Edit', 'Ubah')}
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="bg-red-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-red-700 transition flex items-center justify-center"
                    title={tr('Delete', 'Hapus')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Content/List View */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-160">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-black">{tr('Product', 'Produk')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-black">{tr('Category', 'Kategori')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-black">{tr('Price', 'Harga')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-black">{tr('Stock', 'Stok')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-black">{tr('Actions', 'Aksi')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded relative overflow-hidden shrink-0">
                        {product.image_url ? (
                          <SafeImage
                            src={product.image_url}
                            alt={product.name}
                            fill
                            category={product.category}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-black">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500 truncate max-w-md">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-black">{product.category}</td>
                  <td className="px-6 py-4 text-sm font-medium text-black">
                    {formatPrice(product.price)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        product.stock === 0
                          ? 'bg-red-100 text-red-700'
                          : product.stock <= 10
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/products/${product.id}`}
                        target="_blank"
                        className="text-gray-600 hover:text-black"
                        title={tr('View', 'Lihat')}
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <Link
                        href={`/admin/dashboard/edit-product/${product.id}`}
                        className="text-gray-600 hover:text-black"
                        title={tr('Edit', 'Ubah')}
                      >
                        <Pencil className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-gray-600 hover:text-red-600"
                        title={tr('Delete', 'Hapus')}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {tr('No products found in this category.', 'Tidak ada produk di kategori ini.')}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-4">
              {t('adminProducts.confirmDelete')}
            </h3>
            <p className="text-gray-600 mb-6">
              {tr('Are you sure you want to delete this product? This action cannot be undone.', 'Yakin ingin menghapus produk ini? Tindakan ini tidak bisa dibatalkan.')}
            </p>
            
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-100 text-black rounded hover:bg-gray-200 transition font-medium"
              >
                {tr('Cancel', 'Batal')}
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
              >
                {tr('Delete', 'Hapus')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
