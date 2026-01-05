'use client'

import { useState } from 'react'
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
    <div className="flex gap-4 py-6 border-b border-gray-200">
      {/* Product Image */}
      <Link
        href={`/products/${product.id}`}
        className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg overflow-hidden relative"
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
            <Package className="w-8 h-8" />
          </div>
        )}
      </Link>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-black hover:text-gray-700 transition">
            {product.name}
          </h3>
        </Link>

        <p className="text-sm text-gray-600 mt-1">{product.category}</p>

        {/* Size and Color */}
        <div className="flex gap-4 mt-2 text-sm text-gray-600">
          {item.size && (
            <div>
              <span className="font-medium">Size:</span> {item.size}
            </div>
          )}
          {item.color && (
            <div>
              <span className="font-medium">Color:</span> {item.color}
            </div>
          )}
        </div>

        {/* Price */}
        <p className="text-lg font-bold text-black mt-2">
          {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(itemTotal)}
        </p>

        {/* Stock Warning */}
        {product.stock < item.quantity && (
          <p className="text-sm text-red-600 mt-1">
            Only {product.stock} items left in stock
          </p>
        )}
        {product.stock === 0 && (
          <p className="text-sm text-red-600 mt-1">Out of stock</p>
        )}
      </div>

      {/* Quantity Controls and Remove */}
      <div className="flex flex-col items-end justify-between">
        {/* Quantity Controls */}
        <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-2 py-1">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={isUpdating || disabled || item.quantity <= 1}
            className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Minus className="w-4 h-4" />
          </button>

          <span className="font-medium min-w-[2rem] text-center">
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
            className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Remove Button */}
        <button
          onClick={handleRemove}
          disabled={isUpdating || disabled}
          className="text-gray-500 hover:text-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Remove from cart"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
