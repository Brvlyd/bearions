'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import Link from 'next/link'
import { ShoppingBag, ArrowRight, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cartService } from '@/lib/cart'
import CartItem from '@/components/CartItem'
import type { CartItem as CartItemType } from '@/lib/supabase'

export default function CartPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [cartItems, setCartItems] = useState<CartItemType[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login?redirect=/cart')
      return
    }

    setUserId(user.id)
    loadCart(user.id)
  }

  const loadCart = async (uid: string) => {
    try {
      setLoading(true)
      const items = await cartService.getCartItems(uid)
      setCartItems(items)
    } catch (error) {
      console.error('Error loading cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    try {
      setUpdating(true)
      await cartService.updateCartItemQuantity(itemId, quantity)
      if (userId) {
        await loadCart(userId)
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
      alert(t('common.edit'))
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    try {
      setUpdating(true)
      await cartService.removeFromCart(itemId)
      if (userId) {
        await loadCart(userId)
      }
    } catch (error) {
      console.error('Error removing item:', error)
      alert(t('cart.remove'))
    } finally {
      setUpdating(false)
    }
  }

  const handleClearCart = async () => {
    if (!confirm(t('cart.clearCart') + '?')) return

    try {
      setUpdating(true)
      if (userId) {
        await cartService.clearCart(userId)
        await loadCart(userId)
      }
    } catch (error) {
      console.error('Error clearing cart:', error)
      alert(t('cart.clearCart'))
    } finally {
      setUpdating(false)
    }
  }

  // Calculate totals
  const subtotal = cartItems.reduce((total, item) => {
    return total + (item.product?.price || 0) * item.quantity
  }, 0)

  const shippingCost = subtotal > 0 ? 15000 : 0 // Free shipping above 500k
  const tax = subtotal * 0.11 // 11% PPN
  const total = subtotal + shippingCost + tax

  // Check if any items are out of stock
  const hasOutOfStock = cartItems.some((item) => item.product?.stock === 0)
  const hasInsufficientStock = cartItems.some(
    (item) => item.product && item.product.stock < item.quantity
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-12 pt-24">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            <p className="mt-4 text-gray-600">{t('cart.loading') || 'Loading cart...'}</p>
          </div>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-12 pt-24">
          <div className="max-w-md mx-auto text-center">
            <ShoppingBag className="w-24 h-24 mx-auto text-gray-300 mb-6" />
            <h1 className="text-2xl font-bold text-black mb-2">{t('cart.empty')}</h1>
            <p className="text-gray-600 mb-8">
              {t('cart.emptyDescription')}
            </p>
            <Link
              href="/catalog"
              className="inline-block bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              {t('cart.browseProducts')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 pt-24 lg:pt-28">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-black">{t('cart.title')}</h1>
            <button
              onClick={handleClearCart}
              disabled={updating}
              className="text-sm text-gray-600 hover:text-red-600 disabled:opacity-50 btn-animate px-3 lg:px-4 py-2 rounded-lg hover:bg-red-50"
            >
              {t('cart.clearCart')}
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
              <h2 className="text-xl font-semibold text-black mb-4">
                {t('cart.items')} ({cartItems.length})
              </h2>

              {/* Warnings */}
              {(hasOutOfStock || hasInsufficientStock) && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    {hasOutOfStock && (
                      <p>{t('cart.outOfStockWarning')}</p>
                    )}
                    {hasInsufficientStock && (
                      <p>{t('cart.insufficientStockWarning')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Cart Items List */}
              <div className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemoveItem}
                    disabled={updating}
                  />
                ))}
              </div>
            </div>

            {/* Continue Shopping */}
            <Link
              href="/catalog"
              className="inline-block mt-4 text-gray-600 hover:text-black transition"
            >
              ← {t('cart.continueShopping')}
            </Link>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6 lg:sticky lg:top-20">
              <h2 className="text-xl font-semibold text-black mb-4">
                {t('cart.summary')}
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.subtotal')}</span>
                  <span>
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.shipping')}</span>
                  <span>
                    {shippingCost === 0
                      ? t('cart.freeShipping')
                      : new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                        }).format(shippingCost)}
                  </span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.tax')}</span>
                  <span>
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(tax)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-black">
                    <span>{t('cart.total')}</span>
                    <span>
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      }).format(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <Link
                href="/checkout"
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold ${
                  hasOutOfStock || hasInsufficientStock
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'btn-primary-animated'
                }`}
                onClick={(e) => {
                  if (hasOutOfStock || hasInsufficientStock) {
                    e.preventDefault()
                  }
                }}
              >
                {t('cart.checkout')}
                <ArrowRight className="w-5 h-5" />
              </Link>

              {/* Security Badge */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  {t('cart.secureCheckout')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
