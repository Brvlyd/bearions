'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Product } from '@/lib/supabase'
import { productService } from '@/lib/products'
import { ArrowLeft } from 'lucide-react'
import ImageCarousel from '@/components/ImageCarousel'

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [productId, setProductId] = useState<string>('')

  useEffect(() => {
    params.then(p => setProductId(p.id))
  }, [params])

  useEffect(() => {
    if (productId) {
      loadProduct()
    }
  }, [productId])

  const loadProduct = async () => {
    try {
      setLoading(true)
      const data = await productService.getProductById(productId)
      setProduct(data)
      
      // Load product images
      const productImages = await productService.getProductImages(productId)
      const imageUrls = productImages.map((img: any) => img.image_url)
      
      // Use images from product_images table, or fallback to main image_url
      if (imageUrls.length > 0) {
        setImages(imageUrls)
      } else if (data.image_url) {
        setImages([data.image_url])
      }
    } catch (error) {
      console.error('Error loading product:', error)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link href="/catalog" className="text-black underline">
            Back to catalog
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-black mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Product Image Carousel */}
          <div className="w-full max-w-xl mx-auto">
            <div className="aspect-square bg-white rounded-lg overflow-hidden relative">
              {images.length > 0 ? (
                <ImageCarousel images={images} alt={product.name} autoPlay={true} interval={3000} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-gray-100 text-sm rounded text-black">
                {product.category}
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-4 text-black">{product.name}</h1>
            <p className="text-3xl font-bold mb-6 text-black">{formatPrice(product.price)}</p>
            
            {product.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2 text-black">Description</h2>
                <p className="text-black">{product.description}</p>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2 text-black">Availability</h2>
              <p className={`text-lg font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
              </p>
            </div>

            {product.stock > 0 ? (
              <button
                className="w-full bg-black text-white py-4 rounded-lg font-semibold hover:bg-gray-800 transition"
              >
                Add to Cart
              </button>
            ) : (
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 py-4 rounded-lg font-semibold cursor-not-allowed"
              >
                Out of Stock
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
