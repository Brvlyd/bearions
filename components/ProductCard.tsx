'use client'

import Link from 'next/link'
import { Product } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { productService } from '@/lib/products'
import { getImageUrl } from '@/lib/image-utils'
import SafeImage from './SafeImage'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { t, language } = useLanguage()
  
  const getProductName = () => {
    if (language === 'id' && product.name_id) {
      return product.name_id
    }
    return product.name
  }
  
  const getProductDescription = () => {
    if (language === 'id' && product.description_id) {
      return product.description_id
    }
    return product.description
  }
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
          ) : (
            <SafeImage
              src={images[0] || product.image_url}
              alt={getProductName()}
              fill
              category={product.category}
              className="transition-transform duration-300 group-hover:scale-105"
            />
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <span className="text-white font-semibold">{t('product.outOfStock')}</span>
            </div>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-1 group-hover:text-gray-600 transition text-black">
          {getProductName()}
        </h3>
        <p className="text-black font-bold">{formatPrice(product.price)}</p>
        <p className="text-sm text-gray-500 mt-1">{t('product.stock')}: {product.stock}</p>
      </div>
    </Link>
  )
}
