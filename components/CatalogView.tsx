'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import ProductCard from './ProductCard'
import Pagination from './Pagination'
import { usePagination } from '@/lib/hooks/usePagination'
import { Product, supabase } from '@/lib/supabase'
import { productService } from '@/lib/products'
import { getEffectiveIdrPrice } from '@/lib/price'

interface Category {
  id: string
  name: string
  description?: string
}

const PRODUCTS_PER_PAGE = 9
/** Above this count the category list gets its own search box. */
const CATEGORY_SEARCH_THRESHOLD = 8

export default function CatalogView() {
  const { t, tr, language } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState('All Products')
  const [categoryQuery, setCategoryQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('featured')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [productImages, setProductImages] = useState<Record<string, string[]> | null>(null)

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await productService.getAllProducts()
      setProducts(data)

      // One batched query for every card's images, instead of one per card.
      try {
        const imageMap = await productService.getImagesForProducts(
          data.map((p) => p.id)
        )
        setProductImages(imageMap)
      } catch (imageError) {
        // Cards fall back to their own fetch if the batch fails.
        console.error('Error loading product images:', imageError)
      }
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

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const filteredProducts = useMemo(() => {
    let filtered = [...products]

    // Filter by category
    if (selectedCategory !== 'All Products') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort. Price sorting follows the price on the tag, so a discounted product
    // does not sort as if the customer were paying the crossed-out figure.
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => getEffectiveIdrPrice(a) - getEffectiveIdrPrice(b))
        break
      case 'price-high':
        filtered.sort((a, b) => getEffectiveIdrPrice(b) - getEffectiveIdrPrice(a))
        break
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      default:
        // Featured - keep original order
        break
    }

    return filtered
  }, [products, selectedCategory, searchQuery, sortBy])

  const visibleCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase()
    if (!query) return categories
    return categories.filter(c => c.name.toLowerCase().includes(query))
  }, [categories, categoryQuery])

  const { page, setPage, totalPages, pageItems, firstItemIndex, lastItemIndex, totalItems } =
    usePagination(filteredProducts, PRODUCTS_PER_PAGE)

  // Changing what is being browsed starts over at the first page.
  useEffect(() => {
    setPage(1)
  }, [selectedCategory, searchQuery, sortBy, setPage])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const selectCategory = (name: string) => {
    setSelectedCategory(name)
    // On mobile the list is an overlay-style panel; close it after choosing.
    setSidebarOpen(false)
  }

  const categoryButtonClass = (isActive: boolean) =>
    `w-full text-left px-3 py-2.5 rounded transition wrap-break-word ${
      isActive ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'
    }`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Sidebar */}
        <aside className={`lg:w-64 lg:shrink-0 min-w-0 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-6 lg:sticky lg:top-24">
            <h2 className="font-bold text-lg mb-4 text-black">{t('catalog.filterByCategory')}</h2>

            {categories.length > CATEGORY_SEARCH_THRESHOLD && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                  placeholder={tr('Search categories...', 'Cari kategori...')}
                  className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
                {categoryQuery && (
                  <button
                    type="button"
                    onClick={() => setCategoryQuery('')}
                    aria-label={tr('Clear search', 'Bersihkan pencarian')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Long category lists scroll inside the panel instead of pushing
                the page down on mobile or stretching the sidebar on desktop. */}
            <ul className="space-y-1 max-h-72 lg:max-h-104 overflow-y-auto overscroll-contain pr-1">
              <li>
                <button
                  onClick={() => selectCategory('All Products')}
                  className={categoryButtonClass(selectedCategory === 'All Products')}
                >
                  {language === 'id' ? 'Semua Produk' : 'All Products'}
                </button>
              </li>
              {visibleCategories.map((category) => (
                <li key={category.id}>
                  <button
                    onClick={() => selectCategory(category.name)}
                    className={categoryButtonClass(selectedCategory === category.name)}
                    title={category.name}
                  >
                    {category.name}
                  </button>
                </li>
              ))}
              {visibleCategories.length === 0 && (
                <li className="px-3 py-4 text-sm text-gray-500 text-center">
                  {tr('No categories found', 'Kategori tidak ditemukan')}
                </li>
              )}
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden mb-4 px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {sidebarOpen ? tr('Hide Filters', 'Sembunyikan Filter') : tr('Show Filters', 'Tampilkan Filter')}
          </button>

          {/* Header */}
          <div className="mb-8 min-w-0">
            <h1 className="text-2xl font-bold text-black wrap-break-word min-w-0">
              {selectedCategory === 'All Products'
                ? (language === 'id' ? 'Semua Produk' : 'All Products')
                : selectedCategory
              }
            </h1>
          </div>

          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 mb-8">
            <form onSubmit={handleSearch} className="flex-1 relative min-w-0">
              <input
                type="text"
                placeholder={tr('Search...', 'Cari...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-gray-600"
              />
              <button
                type="submit"
                aria-label={tr('Search', 'Cari')}
                className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 rounded-lg"
              >
                <Search className="w-5 h-5 text-gray-400" />
              </button>
            </form>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-black whitespace-nowrap">{t('catalog.sortBy')}:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 sm:flex-none px-3 lg:px-4 py-2 lg:py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black text-sm lg:text-base"
              >
                <option value="featured">{t('catalog.sortNewest')}</option>
                <option value="price-low">{t('catalog.sortPriceLow')}</option>
                <option value="price-high">{t('catalog.sortPriceHigh')}</option>
                <option value="name">{t('catalog.sortNameAZ')}</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div id="catalog-products">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                <p className="mt-4 text-gray-600">{t('common.loading')}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">{t('catalog.noProducts')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  {pageItems.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      images={
                        productImages
                          ? productImages[product.id] ??
                            (product.image_url ? [product.image_url] : [])
                          : undefined
                      }
                    />
                  ))}
                </div>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  firstItemIndex={firstItemIndex}
                  lastItemIndex={lastItemIndex}
                  totalItems={totalItems}
                  itemLabel={{ en: 'products', id: 'produk' }}
                  scrollTargetId="catalog-products"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
