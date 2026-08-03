'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, Plus, Minus } from 'lucide-react'
import ImageCarousel from '@/components/ImageCarousel'
import { Product } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import { cartService } from '@/lib/cart'
import { isDiscounted } from '@/lib/price'
import ProductPrice from '@/components/ProductPrice'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/components/CategoryProvider'
import { getCategoryLabel } from '@/lib/categories'

export default function ProductDetailClient({
  product,
  initialImages,
}: {
  product: Product
  initialImages: string[]
}) {
  const router = useRouter()
  const { t, tr, language } = useLanguage()
  const categories = useCategories()
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [addingToCart, setAddingToCart] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [images] = useState<string[]>(initialImages)

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

  const colorOptions = ['Black', 'White', 'Navy', 'Gray', 'Beige']

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
                    {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
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
                  <h2 className="text-base lg:text-lg font-semibold mb-3 text-black">{tr('Color', 'Warna')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-4 lg:px-6 py-2 border-2 rounded-lg font-semibold transition text-sm lg:text-base ${
                          selectedColor === color
                            ? 'border-black bg-black text-white'
                            : 'border-gray-300 text-black hover:border-black'
                        }`}
                      >
                        {tr(
                          color,
                          color === 'Black'
                            ? 'Hitam'
                            : color === 'White'
                              ? 'Putih'
                              : color === 'Navy'
                                ? 'Biru Navy'
                                : color === 'Gray'
                                  ? 'Abu-abu'
                                  : 'Krem'
                        )}
                      </button>
                    ))}
                  </div>
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

        <div className="mt-10">
          <Link href="/catalog" className="text-black underline">
            {t('nav.catalog')}
          </Link>
        </div>
      </div>
    </div>
  )
}
