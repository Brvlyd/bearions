'use client'

import Link from 'next/link'
import { Product } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { productService } from '@/lib/products'
import ImageCarousel from './ImageCarousel'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadImages()
  }, [product.id])

  const loadImages = async () => {
    try {
      const productImages = await productService.getProductImages(product.id)
      const imageUrls = productImages.map((img: any) => img.image_url)
      
      // If no images in product_images table, use main image_url
      if (imageUrls.length > 0) {
        setImages(imageUrls)
      } else if (product.image_url) {
        setImages([product.image_url])
      }
    } catch (error) {
      console.error('Error loading product images:', error)
      // Fallback to main image
      if (product.image_url) {
        setImages([product.image_url])
      }
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

  return (
    <Link href={`/products/${product.id}`}>
      <div className="group cursor-pointer">
        <div className="aspect-square bg-gray-50 border border-gray-200 rounded-lg overflow-hidden mb-4 relative">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : images.length > 0 ? (
            <ImageCarousel images={images} alt={product.name} autoPlay={true} interval={3000} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-1 group-hover:text-gray-600 transition text-black">
          {product.name}
        </h3>
        <p className="text-black font-bold">{formatPrice(product.price)}</p>
        <p className="text-sm text-gray-500 mt-1">Stock: {product.stock}</p>
      </div>
    </Link>
  )
}
