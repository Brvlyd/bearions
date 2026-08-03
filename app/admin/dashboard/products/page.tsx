'use client'

import { useEffect, useMemo, useState } from 'react'
import { Product, supabase } from '@/lib/supabase'
import { productService } from '@/lib/products'
import { useLanguage } from '@/lib/i18n'
import { getErrorMessage } from '@/lib/errors'
import { usePagination } from '@/lib/hooks/usePagination'
import SafeImage from '@/components/SafeImage'
import Pagination from '@/components/Pagination'
import DiscountBadge from '@/components/DiscountBadge'
import {
  formatIDR,
  formatUSD,
  getDiscountPercent,
  getSalePrice,
  getUsdPrice,
  isDiscounted,
} from '@/lib/price'
import Link from 'next/link'
import { Eye, Package, AlertCircle, Search, SlidersHorizontal, Grid, List, Pencil, Trash2, Filter, PlusCircle, Plus, Tags, ChevronDown, X } from 'lucide-react'

type ViewMode = 'tiles' | 'content'
type SortOption = 'name-asc' | 'name-desc' | 'newest' | 'oldest' | 'stock-high' | 'stock-low'

interface Category {
  id: string
  name: string
  description?: string
  created_at?: string
  updated_at?: string
}

const PRODUCTS_PER_PAGE = 12
const CATEGORIES_PER_PAGE = 8
/** Above this count a list gets its own search box so it stays scannable. */
const CATEGORY_SEARCH_THRESHOLD = 6

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
  const [filterCategorySearch, setFilterCategorySearch] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Category management (moved here from the Content/landing page manager)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesTableMissing, setCategoriesTableMissing] = useState(false)
  const [showCategoryPanel, setShowCategoryPanel] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryMessage, setCategoryMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  useEffect(() => {
    loadProducts()
    loadCategories()
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

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading categories:', error)
        if (getErrorMessage(error)?.includes('relation "categories" does not exist')) {
          setCategoriesTableMissing(true)
        }
        return
      }

      setCategoriesTableMissing(false)
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const formatPrice = (price: number) => formatIDR(price)

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

  // ---- Category management ----

  const openAddCategoryModal = () => {
    setEditingCategory(null)
    setCategoryName('')
    setCategoryDescription('')
    setShowCategoryModal(true)
  }

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setCategoryDescription(category.description || '')
    setShowCategoryModal(true)
  }

  const closeCategoryModal = () => {
    setShowCategoryModal(false)
    setEditingCategory(null)
    setCategoryName('')
    setCategoryDescription('')
  }

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      setCategoryMessage({ type: 'error', text: tr('Category name is required', 'Nama kategori wajib diisi') })
      return
    }

    try {
      setSavingCategory(true)

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: categoryName.trim(),
            description: categoryDescription.trim()
          })
          .eq('id', editingCategory.id)

        if (error) {
          if (getErrorMessage(error)?.includes('duplicate key')) {
            throw new Error(tr('A category with this name already exists.', 'Kategori dengan nama ini sudah ada.'))
          }
          throw new Error(getErrorMessage(error) || tr('Failed to update category', 'Gagal memperbarui kategori'))
        }

        setCategoryMessage({ type: 'success', text: tr('Category updated successfully!', 'Kategori berhasil diperbarui!') })
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({
            name: categoryName.trim(),
            description: categoryDescription.trim()
          })

        if (error) {
          if (getErrorMessage(error)?.includes('relation "categories" does not exist')) {
            setCategoriesTableMissing(true)
            throw new Error(tr(
              'Categories table not found. Please run categories-schema.sql in Supabase first.',
              'Tabel kategori tidak ditemukan. Jalankan categories-schema.sql di Supabase terlebih dahulu.'
            ))
          }
          if (getErrorMessage(error)?.includes('duplicate key')) {
            throw new Error(tr('A category with this name already exists.', 'Kategori dengan nama ini sudah ada.'))
          }
          throw new Error(getErrorMessage(error) || tr('Failed to add category', 'Gagal menambahkan kategori'))
        }

        setCategoryMessage({ type: 'success', text: tr('Category added successfully!', 'Kategori berhasil ditambahkan!') })
      }

      await loadCategories()
      closeCategoryModal()
    } catch (error) {
      console.error('Error saving category:', error)
      setCategoryMessage({
        type: 'error',
        text: getErrorMessage(error) || tr('Failed to save category', 'Gagal menyimpan kategori')
      })
    } finally {
      setSavingCategory(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id)

      if (error) {
        throw new Error(getErrorMessage(error) || tr('Failed to delete category', 'Gagal menghapus kategori'))
      }

      setCategoryMessage({ type: 'success', text: tr('Category deleted successfully!', 'Kategori berhasil dihapus!') })
      await loadCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      setCategoryMessage({
        type: 'error',
        text: getErrorMessage(error) || tr('Failed to delete category', 'Gagal menghapus kategori')
      })
    } finally {
      setCategoryToDelete(null)
    }
  }

  const countProductsInCategory = (name: string) => products.filter(p => p.category === name).length

  // ---- Derived data ----

  const filteredProducts = useMemo(() => {
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
  }, [products, categoryFilter, searchQuery, sortBy])

  // Managed categories first, plus any category still referenced by a product.
  const filterCategoryNames = useMemo(() => {
    const names = new Set<string>(categories.map(c => c.name))
    products.forEach(p => {
      if (p.category) names.add(p.category)
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [categories, products])

  const visibleFilterCategories = useMemo(() => {
    const query = filterCategorySearch.trim().toLowerCase()
    if (!query) return filterCategoryNames
    return filterCategoryNames.filter(name => name.toLowerCase().includes(query))
  }, [filterCategoryNames, filterCategorySearch])

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase()
    if (!query) return categories
    return categories.filter(c =>
      c.name.toLowerCase().includes(query) ||
      (c.description || '').toLowerCase().includes(query)
    )
  }, [categories, categorySearch])

  const productPagination = usePagination(filteredProducts, PRODUCTS_PER_PAGE)
  const categoryPagination = usePagination(filteredCategories, CATEGORIES_PER_PAGE)

  const { setPage: setProductPage } = productPagination
  const { setPage: setCategoryPage } = categoryPagination

  // Any change to the product filters restarts the list at page 1.
  useEffect(() => {
    setProductPage(1)
  }, [categoryFilter, searchQuery, sortBy, setProductPage])

  useEffect(() => {
    setCategoryPage(1)
  }, [categorySearch, setCategoryPage])

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
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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

      {/* Category Management */}
      <section id="category-management" className="mb-6 lg:mb-8 bg-white border border-gray-200 rounded-lg">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between lg:p-6">
          <button
            type="button"
            onClick={() => setShowCategoryPanel(!showCategoryPanel)}
            aria-expanded={showCategoryPanel}
            aria-controls="category-management-body"
            className="flex items-center gap-3 text-left min-w-0"
          >
            <span className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Tags className="w-5 h-5 text-black" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-bold text-black">
                <span className="truncate">{tr('Product Categories', 'Kategori Produk')}</span>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                  {categories.length}
                </span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${showCategoryPanel ? 'rotate-180' : ''}`} />
              </span>
              <span className="block text-sm text-gray-600 truncate">
                {tr('Manage product categories for your store', 'Kelola kategori produk untuk toko Anda')}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setShowCategoryPanel(true); openAddCategoryModal() }}
            className="shrink-0 inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            {tr('Add Category', 'Tambah Kategori')}
          </button>
        </div>

        {showCategoryPanel && (
          <div id="category-management-body" className="border-t border-gray-200 p-4 lg:p-6">
            {categoryMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                categoryMessage.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {categoryMessage.text}
              </div>
            )}

            {categoriesTableMissing && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">⚠️ {tr('Setup Required', 'Perlu Setup')}</h4>
                <p className="text-sm text-yellow-800 mb-2">
                  {tr(
                    'If this is your first time using categories, please run the SQL schema file first:',
                    'Jika ini pertama kali Anda menggunakan kategori, jalankan file schema SQL berikut terlebih dahulu:'
                  )}
                </p>
                <ol className="text-sm text-yellow-800 list-decimal list-inside space-y-1">
                  <li>{tr('Open Supabase Dashboard -> SQL Editor', 'Buka Supabase Dashboard -> SQL Editor')}</li>
                  <li>
                    {tr('Copy and paste the content from', 'Salin lalu tempel isi dari')}{' '}
                    <code className="bg-yellow-100 px-1 rounded">categories-schema.sql</code>
                  </li>
                  <li>{tr('Click "Run" to create the categories table', 'Klik "Run" untuk membuat tabel kategori')}</li>
                  <li>{tr('Refresh this page', 'Refresh halaman ini')}</li>
                </ol>
              </div>
            )}

            {categories.length > CATEGORY_SEARCH_THRESHOLD && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder={tr('Search categories...', 'Cari kategori...')}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-black"
                />
                {categorySearch && (
                  <button
                    type="button"
                    onClick={() => setCategorySearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-black"
                    aria-label={tr('Clear search', 'Bersihkan pencarian')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {filteredCategories.length === 0 ? (
              <div className="text-center py-10 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                {categories.length === 0
                  ? tr(
                      'No categories yet. Click "Add Category" to create one.',
                      'Belum ada kategori. Klik "Tambah Kategori" untuk membuat kategori baru.'
                    )
                  : tr('No categories match your search.', 'Tidak ada kategori yang cocok dengan pencarian.')}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
                  {categoryPagination.pageItems.map((category) => (
                    <div
                      key={category.id}
                      className="flex flex-col border border-gray-200 rounded-lg p-4 bg-white min-w-0"
                    >
                      <h3 className="font-bold text-black wrap-break-word line-clamp-2" title={category.name}>
                        {category.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {tr(
                          `${countProductsInCategory(category.name)} product(s)`,
                          `${countProductsInCategory(category.name)} produk`
                        )}
                      </p>
                      {category.description && (
                        <p className="mt-2 text-sm text-gray-600 wrap-break-word line-clamp-2" title={category.description}>
                          {category.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => openEditCategoryModal(category)}
                          className="flex-1 bg-gray-100 text-black px-3 py-2 rounded text-sm hover:bg-gray-200 transition flex items-center justify-center gap-1"
                        >
                          <Pencil className="w-4 h-4" />
                          {tr('Edit', 'Ubah')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(category)}
                          className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition flex items-center justify-center"
                          aria-label={tr('Delete category', 'Hapus kategori')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <Pagination
                  page={categoryPagination.page}
                  totalPages={categoryPagination.totalPages}
                  onPageChange={categoryPagination.setPage}
                  firstItemIndex={categoryPagination.firstItemIndex}
                  lastItemIndex={categoryPagination.lastItemIndex}
                  totalItems={categoryPagination.totalItems}
                  itemLabel={{ en: 'categories', id: 'kategori' }}
                  scrollTargetId="category-management"
                />
              </>
            )}
          </div>
        )}
      </section>

      {/* Search and Filter Bar */}
      <div id="product-list" className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search Bar */}
        <div className="relative w-full min-w-0 lg:flex-1">
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
            className={`inline-flex items-center gap-2 px-4 py-3 border rounded-lg font-medium transition max-w-[60vw] sm:max-w-xs ${
              categoryFilter === 'all'
                ? 'bg-white border-gray-200 text-black hover:bg-gray-50'
                : 'bg-black border-black text-white hover:bg-gray-800'
            }`}
            title={tr('Filter by Category', 'Filter Kategori')}
          >
            <Filter className="w-5 h-5 shrink-0" />
            <span className="truncate">
              {categoryFilter === 'all' ? tr('Category', 'Kategori') : categoryFilter}
            </span>
          </button>

          {showCategoryFilter && (
            <>
              {/* Click-away layer so the menu closes on any outside tap */}
              <div className="fixed inset-0 z-10" onClick={() => setShowCategoryFilter(false)} />
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-500 px-2 py-1">{tr('FILTER BY CATEGORY', 'FILTER KATEGORI')}</p>

                  {filterCategoryNames.length > CATEGORY_SEARCH_THRESHOLD && (
                    <div className="relative px-1 pb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        autoFocus
                        value={filterCategorySearch}
                        onChange={(e) => setFilterCategorySearch(e.target.value)}
                        placeholder={tr('Search...', 'Cari...')}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                      />
                    </div>
                  )}

                  {/* Long category lists scroll instead of running off the screen */}
                  <div className="max-h-64 overflow-y-auto overscroll-contain">
                    <button
                      onClick={() => { setCategoryFilter('all'); setShowCategoryFilter(false); setFilterCategorySearch('') }}
                      className={`w-full text-left px-3 py-2 rounded btn-animate ${categoryFilter === 'all' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-100'}`}
                    >
                      {tr('All Categories', 'Semua Kategori')}
                    </button>
                    {visibleFilterCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => { setCategoryFilter(category); setShowCategoryFilter(false); setFilterCategorySearch('') }}
                        className={`w-full text-left px-3 py-2 rounded btn-animate wrap-break-word ${categoryFilter === category ? 'bg-gray-100 font-medium' : 'hover:bg-gray-100'}`}
                      >
                        {category}
                      </button>
                    ))}
                    {visibleFilterCategories.length === 0 && (
                      <p className="px-3 py-4 text-sm text-gray-500 text-center">
                        {tr('No categories found', 'Kategori tidak ditemukan')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
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
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg z-20">
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
            </>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 ml-auto lg:ml-0">
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

      {/* Active category filter chip */}
      {categoryFilter !== 'all' && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">{tr('Filtered by:', 'Difilter berdasarkan:')}</span>
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className="inline-flex items-center gap-2 max-w-full px-3 py-1.5 rounded-full bg-gray-100 text-sm text-black hover:bg-gray-200 transition"
          >
            <span className="truncate">{categoryFilter}</span>
            <X className="w-4 h-4 shrink-0" />
          </button>
        </div>
      )}

      {/* Products Display */}
      {viewMode === 'tiles' ? (
        /* Tiles View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {productPagination.pageItems.map((product) => (
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
                {/* Discount badge, mirroring the storefront so an admin can see
                    at a glance which products are on sale right now. */}
                {isDiscounted(product) && (
                  <DiscountBadge
                    percent={getDiscountPercent(product)!}
                    size="md"
                    className="absolute top-2 left-2 z-10"
                  />
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
                <p className="text-sm text-gray-500 mb-2 truncate">{product.category}</p>
                <div className="flex justify-between items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-black min-w-0 truncate">
                    {isDiscounted(product) ? (
                      <>
                        <span className="flex items-center gap-2">
                          <span className="text-red-600">{formatIDR(getSalePrice(product)!)}</span>
                          <DiscountBadge percent={getDiscountPercent(product)!} />
                        </span>
                        <span className="text-sm text-gray-400 line-through block">
                          {formatIDR(product.price)}
                        </span>
                      </>
                    ) : (
                      formatPrice(product.price)
                    )}
                    {getUsdPrice(product) !== null && (
                      <span className="block text-sm font-medium text-gray-500">
                        {formatUSD(getUsdPrice(product)!)}
                      </span>
                    )}
                  </span>
                  <span className={`text-sm font-medium whitespace-nowrap ${
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
              {productPagination.pageItems.map((product) => (
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
                    {isDiscounted(product) ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-red-600">
                            {formatIDR(getSalePrice(product)!)}
                          </span>
                          <DiscountBadge percent={getDiscountPercent(product)!} />
                        </div>
                        <div className="text-sm text-gray-400 line-through">
                          {formatIDR(product.price)}
                        </div>
                      </>
                    ) : (
                      formatPrice(product.price)
                    )}
                    {getUsdPrice(product) !== null && (
                      <div className="text-sm font-normal text-gray-500">
                        {formatUSD(getUsdPrice(product)!)}
                      </div>
                    )}
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

      <Pagination
        page={productPagination.page}
        totalPages={productPagination.totalPages}
        onPageChange={productPagination.setPage}
        firstItemIndex={productPagination.firstItemIndex}
        lastItemIndex={productPagination.lastItemIndex}
        totalItems={productPagination.totalItems}
        itemLabel={{ en: 'products', id: 'produk' }}
        scrollTargetId="product-list"
      />

      {/* Category Add/Edit Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-md w-full my-8">
            <h3 className="text-xl font-bold text-black mb-4">
              {editingCategory ? tr('Edit Category', 'Ubah Kategori') : tr('Add New Category', 'Tambah Kategori Baru')}
            </h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="category-name" className="block text-sm font-medium text-black mb-1">
                  {tr('Category Name *', 'Nama Kategori *')}
                </label>
                <input
                  id="category-name"
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  placeholder={tr('e.g., T-Shirts', 'contoh: Kaos')}
                />
              </div>

              <div>
                <label htmlFor="category-description" className="block text-sm font-medium text-black mb-1">
                  {tr('Description (Optional)', 'Deskripsi (Opsional)')}
                </label>
                <textarea
                  id="category-description"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  placeholder={tr('Brief description of this category', 'Deskripsi singkat untuk kategori ini')}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-6">
              <button
                onClick={closeCategoryModal}
                className="px-4 py-2.5 bg-gray-100 text-black rounded hover:bg-gray-200 transition font-medium"
              >
                {tr('Cancel', 'Batal')}
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={savingCategory}
                className="px-4 py-2.5 bg-black text-white rounded hover:bg-gray-800 transition font-medium disabled:bg-gray-400"
              >
                {savingCategory
                  ? tr('Saving...', 'Menyimpan...')
                  : editingCategory ? tr('Update', 'Perbarui') : tr('Add Category', 'Tambah Kategori')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-black mb-4">{tr('Delete Category', 'Hapus Kategori')}</h3>
            <p className="text-gray-600 mb-2">
              {tr('Are you sure you want to delete', 'Yakin ingin menghapus')}{' '}
              <strong className="text-black wrap-break-word">{categoryToDelete.name}</strong>?{' '}
              {tr('This action cannot be undone.', 'Tindakan ini tidak dapat dibatalkan.')}
            </p>
            {countProductsInCategory(categoryToDelete.name) > 0 && (
              <p className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                {tr(
                  `${countProductsInCategory(categoryToDelete.name)} product(s) still use this category and will keep it as plain text.`,
                  `${countProductsInCategory(categoryToDelete.name)} produk masih memakai kategori ini dan akan menyimpannya sebagai teks biasa.`
                )}
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-6">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2.5 bg-gray-100 text-black rounded hover:bg-gray-200 transition font-medium"
              >
                {tr('Cancel', 'Batal')}
              </button>
              <button
                onClick={handleDeleteCategory}
                className="px-4 py-2.5 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
              >
                {tr('Delete', 'Hapus')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
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

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2.5 bg-gray-100 text-black rounded hover:bg-gray-200 transition font-medium"
              >
                {tr('Cancel', 'Batal')}
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2.5 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
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
