'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, Package } from 'lucide-react'
import type { CartItem as CartItemType } from '@/lib/supabase'
import { productService } from '@/lib/products'
import { formatIDR, getDiscountPercent, getEffectiveIdrPrice, getIdrPrice, isDiscounted } from '@/lib/price'
import DiscountBadge from './DiscountBadge'
import { useCategories } from './CategoryProvider'
import { getCategoryLabel } from '@/lib/categories'

interface CartItemProps {
  item: CartItemType
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemove: (itemId: string) => void
  disabled?: boolean
}

export default function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  disabled = false,
}: CartItemProps) {
  const { t, language } = useLanguage()
  const categories = useCategories()
  const [isUpdating, setIsUpdating] = useState(false)
  const [displayImage, setDisplayImage] = useState<string | null>(item.product?.image_url || null)
  const product = item.product

  useEffect(() => {
    let isActive = true

    const loadImage = async () => {
      if (!product?.id) {
        setDisplayImage(product?.image_url || null)
        return
      }

      try {
        const imageUrls = await productService.getProductImageUrls(product.id, product.image_url)
        const nextImage = imageUrls[0] || product.image_url || null
        if (isActive) {
          setDisplayImage(nextImage)
        }
      } catch (error) {
        console.error('Error loading cart item image:', error)
        if (isActive) {
          setDisplayImage(product.image_url || null)
        }
      }
    }

    void loadImage()

    return () => {
      isActive = false
    }
  }, [product?.id, product?.image_url])

  if (!product) return null

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || isUpdating || disabled) return

    setIsUpdating(true)
    try {
      await onUpdateQuantity(item.id, newQuantity)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemove = async () => {
    if (isUpdating || disabled) return

    setIsUpdating(true)
    try {
      await onRemove(item.id)
    } finally {
      setIsUpdating(false)
    }
  }

  const discounted = isDiscounted(product)
  const discountPercent = getDiscountPercent(product)
  const itemTotal = getEffectiveIdrPrice(product) * item.quantity
  const originalTotal = getIdrPrice(product) * item.quantity

  return (
    <div className="flex flex-col sm:flex-row gap-4 py-4 sm:py-6 border-b border-gray-200">
      <div className="flex gap-4 flex-1">
        {/* Product Image */}
        <Link
          href={`/products/${product.id}`}
          className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-lg overflow-hidden relative"
        >
          {displayImage ? (
            <Image
              src={displayImage}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Package className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          )}
        </Link>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <Link href={`/products/${product.id}`}>
            <h3 className="font-semibold text-sm sm:text-base text-black hover:text-gray-700 transition">
              {product.name}
            </h3>
          </Link>

          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {getCategoryLabel(product.category, categories, language)}
          </p>

          {/* Size and Color */}
          <div className="flex gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
            {item.size && (
              <div>
                <span className="font-medium">{t('product.size')}:</span> {item.size}
              </div>
            )}
            {item.color && (
              <div>
                <span className="font-medium">{t('product.color')}:</span> {item.color}
              </div>
            )}
          </div>

          {/* Price. A discounted line keeps the original visible so the saving
              carries through from the catalog into the cart. */}
          <div className="mt-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p
                className={`text-base sm:text-lg font-bold ${discounted ? 'text-red-600' : 'text-black'}`}
                suppressHydrationWarning
              >
                {formatIDR(itemTotal)}
              </p>
              {discounted && discountPercent !== null && discountPercent > 0 && (
                <DiscountBadge percent={discountPercent} />
              )}
            </div>
            {discounted && (
              <p className="text-xs sm:text-sm text-gray-400 line-through" suppressHydrationWarning>
                {formatIDR(originalTotal)}
              </p>
            )}
          </div>

          {/* Stock Warning */}
          {product.stock < item.quantity && (
            <p className="text-xs sm:text-sm text-red-600 mt-1">
              {t('cart.insufficientStock', { stock: product.stock })}
            </p>
          )}
          {product.stock === 0 && (
            <p className="text-xs sm:text-sm text-red-600 mt-1">{t('cart.outOfStock')}</p>
          )}
        </div>
      </div>

      {/* Quantity Controls and Remove */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-between gap-2">
        {/* Quantity Controls */}
        <div className="flex items-center gap-2 sm:gap-3 bg-gray-100 rounded-lg px-2 py-1">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={isUpdating || disabled || item.quantity <= 1}
            className="p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed btn-quantity-animated text-black hover:text-gray-700"
          >
            <Minus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>

          <span className="font-bold min-w-6 sm:min-w-8 text-center text-sm sm:text-base text-black">
            {item.quantity}
          </span>

          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={
              isUpdating ||
              disabled ||
              item.quantity >= product.stock ||
              product.stock === 0
            }
            className="p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed btn-quantity-animated text-black hover:text-gray-700"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Remove Button */}
        <button
          onClick={handleRemove}
          disabled={isUpdating || disabled}
          className="text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed btn-icon-animated p-2"
          title={t('cart.remove')}
        >
          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  )
}
