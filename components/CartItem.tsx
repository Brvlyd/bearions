'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, Package } from 'lucide-react'
import type { CartItem as CartItemType } from '@/lib/supabase'

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
  const { t } = useLanguage()
  const [isUpdating, setIsUpdating] = useState(false)
  const product = item.product

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

  const itemTotal = product.price * item.quantity

  return (
    <div className="flex flex-col sm:flex-row gap-4 py-4 sm:py-6 border-b border-gray-200">
      <div className="flex gap-4 flex-1">
        {/* Product Image */}
        <Link
          href={`/products/${product.id}`}
          className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-lg overflow-hidden relative"
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
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

          <p className="text-xs sm:text-sm text-gray-600 mt-1">{product.category}</p>

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

          {/* Price - Mobile */}
          <p className="text-base sm:text-lg font-bold text-black mt-2">
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(itemTotal)}
          </p>

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
            className="p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed btn-quantity-animated"
          >
            <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>

          <span className="font-medium min-w-6 sm:min-w-8 text-center text-sm sm:text-base">
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
            className="p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed btn-quantity-animated"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
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
