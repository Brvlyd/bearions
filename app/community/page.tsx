'use client'

import { useState, useEffect } from 'react'
import { Search, Grid3x3, Bookmark, Heart, MessageCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { productService } from '@/lib/products'
import { Product } from '@/lib/supabase'
import { getImageUrl } from '@/lib/image-utils'
import Link from 'next/link'

export default function CommunityPage() {
  const { t, language } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [products, searchQuery, activeTab])

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

  const filterProducts = () => {
    let filtered = [...products]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product => {
        const name = language === 'id' && product.name_id ? product.name_id : product.name
        return name.toLowerCase().includes(searchQuery.toLowerCase())
      })
    }

    // Sort by most liked if active
    if (activeTab === 'most_liked') {
      // Generate consistent random likes based on product id for sorting
      filtered = filtered.sort((a, b) => {
        const likesA = parseInt(a.id.slice(-3), 16) % 500 + 50
        const likesB = parseInt(b.id.slice(-3), 16) % 500 + 50
        return likesB - likesA
      })
    }

    setFilteredProducts(filtered)
  }

  const categories = [
    { id: 'all', label: language === 'en' ? 'All' : 'Semua' },
    { id: 'most_liked', label: language === 'en' ? 'Most Liked' : 'Paling Disukai' },
  ]

  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Search - Instagram Style */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-6 text-black text-center">
            {language === 'en' ? 'Explore Our Community!!!' : 'Jelajahi Komunitas Kami!!!'}
          </h1>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={language === 'en' ? 'Search...' : 'Cari...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>

          {/* Category Tabs - Instagram Style */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide justify-center">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === cat.id
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        )}

        {/* Instagram-style Grid */}
        {!loading && (
          <div className="grid grid-cols-3 gap-1 md:gap-2">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/community/${product.id}`}
                className="relative aspect-square group overflow-hidden bg-gray-100"
              >
                {/* Product Image */}
                <img
                  src={getImageUrl(product.image_url)}
                  alt={language === 'id' && product.name_id ? product.name_id : product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                
                {/* Hover Overlay - Instagram Style */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="flex items-center gap-6 text-white">
                    <div className="flex items-center gap-2">
                      <Heart className="w-6 h-6 fill-white" />
                      <span className="font-semibold">{parseInt(product.id.slice(-3), 16) % 500 + 50}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-6 h-6 fill-white" />
                      <span className="font-semibold">{parseInt(product.id.slice(-2), 16) % 50 + 5}</span>
                    </div>
                  </div>
                </div>

                {/* Product Info - Hidden on mobile, visible on hover */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-white text-xs font-medium truncate">
                    {language === 'id' && product.name_id ? product.name_id : product.name}
                  </p>
                  <p className="text-white text-xs">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(product.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Grid3x3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">
              {language === 'en' ? 'No products found' : 'Tidak ada produk ditemukan'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

