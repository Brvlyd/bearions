'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, Plus, Minus, ImageIcon } from 'lucide-react'
import ImageCarousel from '@/components/ImageCarousel'
import ColorPreviewModal from '@/components/ColorPreviewModal'
import { Product } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import { cartService } from '@/lib/cart'
import { isDiscounted } from '@/lib/price'
import ProductPrice from '@/components/ProductPrice'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/components/CategoryProvider'
import { getCategoryLabel } from '@/lib/categories'
import { PRODUCT_SIZE_OPTIONS } from '@/lib/product-options'
import { resolveColorOptions, type ProductColor } from '@/lib/product-colors'

/** Past this many swatches the list scrolls instead of growing the page. */
const COLOR_SCROLL_THRESHOLD = 10

export default function ProductDetailClient({
  product,
  initialImages,
  initialColors = [],
}: {
  product: Product
  initialImages: string[]
  initialColors?: ProductColor[]
}) {
  const router = useRouter()
  const { t, tr, language } = useLanguage()
  const categories = useCategories()
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [previewColorName, setPreviewColorName] = useState<string | null>(null)
  const [addingToCart, setAddingToCart] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [images] = useState<string[]>(initialImages)

  const colorOptions = useMemo(
    () => resolveColorOptions(initialColors, language),
    [initialColors, language]
  )
  const previewColor = colorOptions.find((color) => color.name === previewColorName) || null

  const handleColorClick = (name: string) => {
    setSelectedColor(name)

    // The popup is the point of the swatch, but a colour the admin has not
    // photographed has nothing to show — that one just selects.
    const option = colorOptions.find((color) => color.name === name)
    if (option?.imageUrl) setPreviewColorName(name)
  }

  const productName = language === 'id' && product.name_id ? product.name_id : product.name || ''
  const productDescription = language === 'id' && product.description_id ? product.description_id : product.description

  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor) {
      setMessage({
        type: 'error',
        text: tr(
          'Please select both a size and a color before adding to cart.',
          'Silakan pilih ukuran dan warna terlebih dahulu sebelum menambahkan ke keranjang.'
        ),
      })
      return
    }

    try {
      setAddingToCart(true)
      setMessage(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: t('login.pleaseLoginFirst') })
        setAddingToCart(false)
        return
      }

      await cartService.addToCart(
        user.id,
        product.id,
        quantity,
        selectedSize,
        selectedColor
      )
      window.dispatchEvent(new Event('cart:updated'))

      setMessage({ type: 'success', text: t('product.addToCart') + '!' })

      setTimeout(() => {
        setMessage(null)
      }, 3000)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error ?? '')

      if (message.includes('CART_POLICY_ERROR')) {
        setMessage({
          type: 'error',
          text: tr(
            'Your cart policy is not configured yet. Please contact admin to run cart SQL fix in Supabase.',
            'Policy cart untuk akun ini belum benar. Mohon admin jalankan SQL fix cart di Supabase.'
          ),
        })
      } else {
        setMessage({
          type: 'error',
          text: message || tr('Failed to add to cart', 'Gagal menambahkan ke keranjang'),
        })
      }
    } finally {
      setAddingToCart(false)
    }
  }

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1)
    }
  }

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-black mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('checkout.back')}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="w-full max-w-xl mx-auto">
            <div className="aspect-square bg-white rounded-lg overflow-hidden relative">
              {images.length > 0 ? (
                <ImageCarousel images={images} alt={productName} autoPlay={false} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  {tr('No Image', 'Tidak Ada Gambar')}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-gray-100 text-sm rounded text-black">
                {getCategoryLabel(product.category, categories, language)}
              </span>
            </div>
            <h1 className="text-2xl lg:text-4xl font-bold mb-4 text-black">{productName}</h1>
            {/* The markdown is the loudest thing on the page after the title:
                sale price in red, original crossed out, saving spelled out. */}
            <div
              className={`mb-6 ${
                isDiscounted(product) ? 'rounded-xl border border-red-100 bg-red-50/60 p-4' : ''
              }`}
            >
              <ProductPrice product={product} size="lg" showSavings showAlt />
            </div>

            {productDescription && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2 text-black">{tr('Description', 'Deskripsi')}</h2>
                <p className="text-black">{productDescription}</p>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2 text-black">{tr('Availability', 'Ketersediaan')}</h2>
              <p className={`text-lg font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock > 0
                  ? `${tr('In Stock', 'Stok Tersedia')} (${product.stock} ${tr('available', 'tersedia')})`
                  : tr('Out of Stock', 'Stok Habis')}
              </p>
            </div>

            {product.stock > 0 && (
              <>
                <div className="mb-6">
                  <h2 className="text-base lg:text-lg font-semibold mb-3 text-black">{tr('Size', 'Ukuran')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCT_SIZE_OPTIONS.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 lg:px-6 py-2 border-2 rounded-lg font-semibold transition text-sm lg:text-base ${
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

                <div className="mb-6">
                  <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h2 className="text-base lg:text-lg font-semibold text-black">{tr('Color', 'Warna')}</h2>
                    {selectedColor && (
                      <span className="text-sm text-gray-500">
                        {colorOptions.find((color) => color.name === selectedColor)?.label || selectedColor}
                      </span>
                    )}
                  </div>

                  {/* An admin can add as many colours as the product really has.
                      The list wraps, and past a threshold it scrolls in place so
                      a long one cannot push Add to Cart off the screen. */}
                  <div
                    className={`flex flex-wrap gap-2 ${
                      colorOptions.length > COLOR_SCROLL_THRESHOLD
                        ? 'max-h-44 overflow-y-auto overscroll-contain pr-1'
                        : ''
                    }`}
                  >
                    {colorOptions.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => handleColorClick(color.name)}
                        title={color.label}
                        aria-pressed={selectedColor === color.name}
                        className={`inline-flex max-w-full items-center gap-2 rounded-lg border-2 px-3 lg:px-4 py-2 text-sm lg:text-base font-semibold transition ${
                          selectedColor === color.name
                            ? 'border-black bg-black text-white'
                            : 'border-gray-300 text-black hover:border-black'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 rounded-full border border-black/15 shadow-inner"
                          style={{ backgroundColor: color.hex || '#e5e7eb' }}
                        />
                        <span className="truncate">{color.label}</span>
                        {color.imageUrl && (
                          <ImageIcon
                            aria-hidden="true"
                            className={`h-3.5 w-3.5 shrink-0 ${
                              selectedColor === color.name ? 'text-white/70' : 'text-gray-400'
                            }`}
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {colorOptions.some((color) => color.imageUrl) && (
                    <p className="mt-2 text-xs text-gray-500">
                      {tr(
                        'Tap a color to see this product in it.',
                        'Klik warna untuk melihat produk dalam warna tersebut.'
                      )}
                    </p>
                  )}
                </div>

                <div className="mb-8">
                  <h2 className="text-base lg:text-lg font-semibold mb-3 text-black">{tr('Quantity', 'Jumlah')}</h2>
                  <div className="flex items-center space-x-3 lg:space-x-4">
                    <button
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-black disabled:opacity-50 disabled:cursor-not-allowed btn-animate-bounce text-black"
                    >
                      <Minus className="w-5 h-5 stroke-[2.5]" />
                    </button>
                    <span className="text-lg lg:text-xl font-bold text-black w-12 text-center">{quantity}</span>
                    <button
                      onClick={incrementQuantity}
                      disabled={quantity >= product.stock}
                      className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-black disabled:opacity-50 disabled:cursor-not-allowed btn-animate-bounce text-black"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {product.stock > 0 ? (
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || !selectedSize || !selectedColor}
                className="w-full py-4 flex items-center justify-center space-x-2 btn-primary-animated disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>{addingToCart ? tr('Adding...', 'Menambahkan...') : tr('Add to Cart', 'Tambah ke Keranjang')}</span>
              </button>
            ) : (
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 py-4 rounded-lg font-semibold cursor-not-allowed"
              >
                {tr('Out of Stock', 'Stok Habis')}
              </button>
            )}

            {message && (
              <p className={`mt-4 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {previewColor && (
        <ColorPreviewModal
          color={previewColor}
          productName={productName}
          category={product.category}
          selected={selectedColor === previewColor.name}
          onConfirm={() => {
            setSelectedColor(previewColor.name)
            setPreviewColorName(null)
          }}
          onClose={() => setPreviewColorName(null)}
        />
      )}
    </div>
  )
}
