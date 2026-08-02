'use client'

import Link from 'next/link'
import { Product } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { productService } from '@/lib/products'
import { formatIDR, formatProductPrice, getSalePrice, isDiscounted } from '@/lib/price'
import SafeImage from './SafeImage'

interface ProductCardProps {
  product: Product
  /** Pre-fetched images from a batched parent query. When provided the card
   *  skips its own request, which is what keeps grid views off spinners. */
  images?: string[]
}

export default function ProductCard({ product, images: providedImages }: ProductCardProps) {
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
  const hasProvidedImages = providedImages !== undefined
  const [images, setImages] = useState<string[]>(
    hasProvidedImages ? providedImages : []
  )
  const [loading, setLoading] = useState(!hasProvidedImages)

  useEffect(() => {
    if (hasProvidedImages) {
      setImages(providedImages)
      return
    }
    loadImages()
  }, [product.id, hasProvidedImages, providedImages])

  const loadImages = async () => {
    try {
      const imageUrls = await productService.getProductImageUrls(product.id, product.image_url)
      setImages(imageUrls)
    } catch (error) {
      console.error('Error loading product images:', error)
      if (product.image_url) {
        setImages([product.image_url])
      }
    } finally {
      setLoading(false)
    }
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
        {isDiscounted(product) ? (
          <div>
            <p className="text-sm text-gray-500 line-through">{formatIDR(product.price)}</p>
            <p className="text-black font-bold">{formatIDR(getSalePrice(product)!)}</p>
          </div>
        ) : (
          <p className="text-black font-bold">{formatProductPrice(product, language)}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">{t('product.stock')}: {product.stock}</p>
      </div>
    </Link>
  )
}
