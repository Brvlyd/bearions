'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, ShoppingCart, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { cartService } from '@/lib/cart'
import { supabase, type Product } from '@/lib/supabase'
import { PRODUCT_SIZE_OPTIONS } from '@/lib/product-options'
import { productColorService, resolveColorOptions, type ProductColor } from '@/lib/product-colors'
import ProductPrice from './ProductPrice'
import SafeImage from './SafeImage'

interface QuickAddModalProps {
  product: Product
  image: string | null
  onClose: () => void
}

/** Fires so CartButton's badge updates without a full page reload. */
const notifyCartUpdated = () => {
  window.dispatchEvent(new Event('cart:updated'))
}

export default function QuickAddModal({ product, image, onClose }: QuickAddModalProps) {
  const { t, tr, language } = useLanguage()
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')
  const [colorRows, setColorRows] = useState<ProductColor[] | null>(null)

  const productName = language === 'id' && product.name_id ? product.name_id : product.name || ''

  // Same source as the detail page, so quick-add can never offer a colour the
  // product is not actually sold in.
  const colorOptions = useMemo(
    () => resolveColorOptions(colorRows, language),
    [colorRows, language]
  )

  // Picking a colour swaps the photo for the one the admin assigned to it, the
  // same way the detail page does. A colour with no photo of its own keeps the
  // card's image rather than blanking the preview.
  const previewImage =
    colorOptions.find((color) => color.name === selectedColor)?.imageUrl ||
    image ||
    product.image_url

  useEffect(() => {
    let cancelled = false

    productColorService
      .getColorsForProduct(product.id)
      .then((rows) => {
        if (!cancelled) setColorRows(rows)
      })
      .catch((loadError) => {
        console.error('Failed to load product colors:', loadError)
        if (!cancelled) setColorRows([])
      })

    return () => {
      cancelled = true
    }
  }, [product.id])

  // The fallback list is on screen while the real colours load, so a fast
  // shopper can pick one this product does not come in. Drop it rather than
  // send a colour the store cannot fulfil to the cart.
  useEffect(() => {
    if (!selectedColor) return
    if (!colorOptions.some((color) => color.name === selectedColor)) setSelectedColor('')
  }, [colorOptions, selectedColor])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor) {
      setError(
        tr(
          'Please select both a size and a color before adding to cart.',
          'Silakan pilih ukuran dan warna terlebih dahulu sebelum menambahkan ke keranjang.'
        )
      )
      return
    }

    try {
      setAdding(true)
      setError('')

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError(t('login.pleaseLoginFirst'))
        setAdding(false)
        return
      }

      await cartService.addToCart(user.id, product.id, quantity, selectedSize, selectedColor)
      notifyCartUpdated()
      setAdded(true)
      setTimeout(onClose, 1200)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err ?? '')

      if (message.includes('CART_POLICY_ERROR')) {
        setError(
          tr(
            'Your cart policy is not configured yet. Please contact admin to run cart SQL fix in Supabase.',
            'Policy cart untuk akun ini belum benar. Mohon admin jalankan SQL fix cart di Supabase.'
          )
        )
      } else {
        setError(message || tr('Failed to add to cart', 'Gagal menambahkan ke keranjang'))
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 backdrop-blur-sm bg-black/20 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={onClose}>
        {/* Animation and panel are centred as one pair, so the panel sits right
            of centre rather than being pushed to the edge of the screen. */}
        <div className="flex w-full items-center justify-center gap-5">
          {/* A proper look at the garment — the header thumbnail is too small to
              judge a colour or a print by. Dropped below lg, where there is no
              room beside the panel and the choices matter more than the photo.
              Click is swallowed because it reads as part of the popup, so it
              must not dismiss a half-filled form the way the backdrop does. */}
          <div
            className="hidden lg:block w-80 xl:w-96 2xl:w-[28rem] shrink-0 aspect-square max-h-[80vh] rounded-xl overflow-hidden bg-gray-50 border border-gray-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SafeImage
              src={previewImage}
              alt={productName}
              fill
              category={product.category}
              sizes="(min-width: 1536px) 28rem, (min-width: 1280px) 24rem, 20rem"
            />
          </div>

          <div
            className="bg-white rounded-xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
              {/* Redundant once the large preview is beside the panel, so it
                  only carries the identity job at the widths that lack one. */}
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0 relative lg:hidden">
                <SafeImage src={previewImage} alt={productName} fill category={product.category} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-black truncate">{productName}</h2>
                <ProductPrice product={product} size="sm" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition shrink-0"
                aria-label={tr('Close', 'Tutup')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-5">
              <div>
                <h3 className="text-sm font-semibold mb-2 text-black">{t('product.size')}</h3>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`px-3.5 py-1.5 border-2 rounded-lg font-semibold transition text-sm ${
                        selectedSize === size
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 text-black hover:border-black'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 text-black">{t('product.color')}</h3>
                {/* Scrolls once the list gets long, so the modal keeps its Add to
                    Cart button reachable however many colours a product has. */}
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto overscroll-contain pr-1">
                  {colorOptions.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setSelectedColor(color.name)}
                      title={color.label}
                      aria-pressed={selectedColor === color.name}
                      className={`inline-flex max-w-full items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-sm font-semibold transition ${
                        selectedColor === color.name
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 text-black hover:border-black'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/15"
                        style={{ backgroundColor: color.hex || '#e5e7eb' }}
                      />
                      <span className="truncate">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 text-black">{t('product.quantity')}</h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-9 h-9 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-black disabled:opacity-50 disabled:cursor-not-allowed btn-animate-bounce text-black"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <span className="text-lg font-bold text-black w-8 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    className="w-9 h-9 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-black disabled:opacity-50 disabled:cursor-not-allowed btn-animate-bounce text-black"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <span className="text-xs text-gray-500">
                    {product.stock} {tr('available', 'tersedia')}
                  </span>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {added && (
                <p className="text-sm font-semibold text-green-600">{t('product.addToCart')}!</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={adding || added}
                className="w-full py-3 flex items-center justify-center gap-2 btn-primary-animated disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>{adding ? t('product.adding') : t('product.addToCart')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
