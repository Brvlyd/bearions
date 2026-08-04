'use client'

import { Suspense, useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import { useDialog } from '@/lib/dialog'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag, ArrowRight, AlertCircle, Gift, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cartService } from '@/lib/cart'
import { shippingService } from '@/lib/shipping'
import { fetchShippingRates } from '@/lib/shipping-client'
import { SHIPPING_ENABLED } from '@/lib/store-config'
import CartItem from '@/components/CartItem'
import LoadingSpinner from '@/components/LoadingSpinner'
import { formatIdrAmount, getEffectiveIdrPrice, getIdrPrice } from '@/lib/price'
import { useIdrPerUsdRate } from '@/lib/use-fx-rate'
import type { AppliedPromotion, CartItem as CartItemType } from '@/lib/supabase'

type PromoPreview = {
  orderDiscount: number
  shippingDiscount: number
  shippingIsFree: boolean
  appliedPromotions: AppliedPromotion[]
}

function CartPageContent() {
  const { t, tr, language } = useLanguage()
  const { confirmDialog, alertDialog } = useDialog()
  const idrPerUsd = useIdrPerUsdRate()
  // Same live rate PayPal settlement uses (lib/paypal.ts), so this estimate
  // never disagrees with what checkout would actually charge.
  const formatPrice = (price: number) => formatIdrAmount(price, language, idrPerUsd)
  const searchParams = useSearchParams()
  const checkoutSuccess = searchParams.get('checkout') === 'success'
  const [cartItems, setCartItems] = useState<CartItemType[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [promoPreview, setPromoPreview] = useState<PromoPreview | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsLoggedIn(false)
      setLoading(false)
      return
    }

    setIsLoggedIn(true)
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

  // Updates apply to the local list in place instead of re-running loadCart,
  // which used to flip the page-level `loading` flag and swap the whole cart
  // out for the full-screen spinner on every +/- click.
  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    try {
      setUpdating(true)
      const updatedItem = await cartService.updateCartItemQuantity(itemId, quantity)
      setCartItems((prev) => prev.map((item) => (item.id === itemId ? updatedItem : item)))
    } catch (error) {
      console.error('Error updating quantity:', error)
      await alertDialog(t('common.edit'), { variant: 'error' })
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    try {
      setUpdating(true)
      await cartService.removeFromCart(itemId)
      setCartItems((prev) => prev.filter((item) => item.id !== itemId))
    } catch (error) {
      console.error('Error removing item:', error)
      await alertDialog(t('cart.remove'), { variant: 'error' })
    } finally {
      setUpdating(false)
    }
  }

  const handleClearCart = async () => {
    const confirmed = await confirmDialog(tr('Clear cart?', 'Kosongkan keranjang?'), {
      confirmText: t('cart.clearCart'),
      isDangerous: true,
    })
    if (!confirmed) return

    try {
      setUpdating(true)
      if (userId) {
        await cartService.clearCart(userId)
        setCartItems([])
      }
    } catch (error) {
      console.error('Error clearing cart:', error)
      await alertDialog(t('cart.clearCart'), { variant: 'error' })
    } finally {
      setUpdating(false)
    }
  }

  // Calculate totals. The summary lists the full price first and the markdown as
  // its own line, so the sale is visible as a saving rather than a lower number.
  const subtotal = cartItems.reduce((total, item) => {
    const price = item.product ? getEffectiveIdrPrice(item.product) : 0
    return total + price * item.quantity
  }, 0)

  const originalSubtotal = cartItems.reduce((total, item) => {
    const price = item.product ? getIdrPrice(item.product) : 0
    return total + price * item.quantity
  }, 0)

  const productSavings = Math.max(0, originalSubtotal - subtotal)
  // Shipping is quoted at checkout once a delivery address is chosen, so the
  // cart total is product cost only — no placeholder shipping estimate here.
  const total = subtotal

  // Preview promo/shipping discounts using the user's default saved address, so
  // the cart shows the same incentive checkout will apply — without moving the
  // shipping cost itself into this page's total, which is still resolved at
  // checkout once the customer confirms (or changes) the delivery address.
  useEffect(() => {
    if (!userId || cartItems.length === 0) {
      setPromoPreview(null)
      return
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      try {
        const savedAddresses = await shippingService.getUserAddresses(userId)
        const address = savedAddresses.find((entry) => entry.is_default) || savedAddresses[0]
        if (!address) {
          if (!cancelled) setPromoPreview(null)
          return
        }

        const result = await fetchShippingRates(address.id)
        const cheapest = result.options[0] || null

        const orderDiscount = SHIPPING_ENABLED ? cheapest?.orderDiscount ?? 0 : result.cartDiscount
        const shippingDiscount = cheapest?.discount ?? 0
        const shippingIsFree = SHIPPING_ENABLED && !!cheapest && cheapest.finalCost === 0
        const appliedPromotions = SHIPPING_ENABLED
          ? cheapest?.appliedPromotions ?? []
          : result.cartPromotions

        if (cancelled) return

        if (orderDiscount <= 0 && shippingDiscount <= 0 && !shippingIsFree) {
          setPromoPreview(null)
          return
        }

        setPromoPreview({ orderDiscount, shippingDiscount, shippingIsFree, appliedPromotions })
      } catch (error) {
        console.error('Error loading cart promo preview:', error)
        if (!cancelled) setPromoPreview(null)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [userId, cartItems.length, subtotal])

  // Check if any items are out of stock
  const hasOutOfStock = cartItems.some((item) => item.product?.stock === 0)
  const hasInsufficientStock = cartItems.some(
    (item) => item.product && item.product.stock < item.quantity
  )

  if (loading) {
    return <LoadingSpinner fullScreen label={t('cart.loading') || 'Loading cart...'} />
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-12 pt-24">
          <div className="max-w-md mx-auto text-center">
            <ShoppingBag className="w-24 h-24 mx-auto text-gray-300 mb-6" />
            <h1 className="text-2xl font-bold text-black mb-2">{t('login.pleaseLoginToViewCart')}</h1>
            <p className="text-gray-600 mb-8">
              {t('login.needLoginForCart')}
            </p>
            <Link
              href="/login"
              className="inline-block bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              {t('nav.signIn')}
            </Link>
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
            {checkoutSuccess && (
              <div className="mb-6 p-4 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm">
                {tr('Order placed successfully! Thank you for your purchase.', 'Pesanan berhasil dibuat! Terima kasih atas pembelian Anda.')}
              </div>
            )}
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
                    formatPrice={formatPrice}
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
                  <span suppressHydrationWarning>{formatPrice(originalSubtotal)}</span>
                </div>

                {productSavings > 0 && (
                  <div className="flex justify-between font-semibold text-red-600">
                    <span>{tr('Product discount', 'Diskon produk')}</span>
                    <span suppressHydrationWarning>-{formatPrice(productSavings)}</span>
                  </div>
                )}

                {promoPreview && promoPreview.orderDiscount > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span>{tr('Promo discount', 'Diskon promo')}</span>
                    <span suppressHydrationWarning>-{formatPrice(promoPreview.orderDiscount)}</span>
                  </div>
                )}

                {promoPreview && (promoPreview.shippingDiscount > 0 || promoPreview.shippingIsFree) && (
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span className="inline-flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      {tr('Shipping discount', 'Diskon ongkir')}
                    </span>
                    <span suppressHydrationWarning>
                      {promoPreview.shippingIsFree
                        ? tr('FREE', 'GRATIS')
                        : `-${formatPrice(promoPreview.shippingDiscount)}`}
                    </span>
                  </div>
                )}

                {promoPreview && (promoPreview.shippingDiscount > 0 || promoPreview.shippingIsFree) && (
                  <p className="text-xs text-gray-500 -mt-2">
                    {tr(
                      'Estimated for your default address — confirmed at checkout.',
                      'Estimasi untuk alamat utama Anda — dipastikan saat checkout.'
                    )}
                  </p>
                )}

                {promoPreview && promoPreview.appliedPromotions.length > 0 && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 space-y-1">
                    {promoPreview.appliedPromotions.map((promotion) => (
                      <p
                        key={promotion.id}
                        className="text-xs text-emerald-800 inline-flex items-center gap-1"
                      >
                        <Gift className="w-3 h-3 shrink-0" />
                        {language === 'en' ? promotion.name : promotion.name_id || promotion.name}
                      </p>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-black">
                    <span>{t('cart.total')}</span>
                    <span suppressHydrationWarning>{formatPrice(total)}</span>
                  </div>
                  {productSavings > 0 && (
                    <p className="mt-1 text-sm font-semibold text-emerald-600" suppressHydrationWarning>
                      {tr(
                        `You save ${formatPrice(productSavings)}`,
                        `Hemat ${formatPrice(productSavings)}`
                      )}
                    </p>
                  )}
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

export default function CartPage() {
  const { tr } = useLanguage()
  return (
    <Suspense fallback={<LoadingSpinner fullScreen label={tr('Loading cart...', 'Memuat keranjang...')} />}>
      <CartPageContent />
    </Suspense>
  )
}
