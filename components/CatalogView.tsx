'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import ProductCard from './ProductCard'
import { Product } from '@/lib/supabase'
import { productService } from '@/lib/products'

const categories = ['All Products', 'Tops', 'Bottoms', 'Accessories', 'Outerwear']

export default function CatalogView() {
  const { t, language } = useLanguage()

  const getCategoryTranslation = (category: string) => {
    const translations: Record<string, { en: string, id: string }> = {
      'All Products': { en: 'All Products', id: 'Semua Produk' },
      'Tops': { en: 'Tops', id: 'Atasan' },
      'Bottoms': { en: 'Bottoms', id: 'Bawahan' },
      'Accessories': { en: 'Accessories', id: 'Aksesoris' },
      'Outerwear': { en: 'Outerwear', id: 'Jaket' }
    }
    return translations[category]?.[language] || category
  }
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState('All Products')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('featured')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    filterAndSortProducts()
  }, [products, selectedCategory, searchQuery, sortBy])

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

  const filterAndSortProducts = () => {
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

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price)
        break
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      default:
        // Featured - keep original order
        break
    }

    setFilteredProducts(filtered)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Sidebar */}
        <aside className={`lg:w-64 shrink-0 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-6">
            <h2 className="font-bold text-lg mb-4 text-black">{t('catalog.filterByCategory')}</h2>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category}>
                  <button
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded transition ${
                      selectedCategory === category
                        ? 'bg-black text-white'
                        : 'hover:bg-gray-100 text-black'
                    }`}
                  >
                    {getCategoryTranslation(category)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden mb-4 px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {sidebarOpen ? 'Hide Filters' : 'Show Filters'}
          </button>
          
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">👕</span>
            </div>
            <h1 className="text-2xl font-bold text-black">{getCategoryTranslation(selectedCategory)}</h1>
          </div>

          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 mb-8">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
