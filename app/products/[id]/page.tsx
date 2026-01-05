'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Product } from '@/lib/supabase'
import { productService } from '@/lib/products'
import { cartService } from '@/lib/cart'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, ShoppingCart, Plus, Minus } from 'lucide-react'
import ImageCarousel from '@/components/ImageCarousel'

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [productId, setProductId] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [addingToCart, setAddingToCart] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    params.then(p => setProductId(p.id))
  }, [params])

  useEffect(() => {
    if (productId) {
      loadProduct()
    }
  }, [productId])

  const loadProduct = async () => {
    try {
      setLoading(true)
      const data = await productService.getProductById(productId)
      setProduct(data)
      
      // Load product images
      const productImages = await productService.getProductImages(productId)
      const imageUrls = productImages.map((img: any) => img.image_url)
      
      // Use images from product_images table, or fallback to main image_url
      if (imageUrls.length > 0) {
        setImages(imageUrls)
      } else if (data.image_url) {
        setImages([data.image_url])
      }
    } catch (error) {
      console.error('Error loading product:', error)
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

  const handleAddToCart = async () => {
    if (!product) return

    try {
      setAddingToCart(true)
      setMessage(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Please login to add items to cart' })
        return
      }

      await cartService.addToCart(
        user.id,
        product.id,
        quantity,
        selectedSize || undefined,
        selectedColor || undefined
      )

      setMessage({ type: 'success', text: 'Product added to cart!' })
      
      // Reset selections after adding
      setTimeout(() => {
        setMessage(null)
      }, 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to add to cart' })
    } finally {
      setAddingToCart(false)
    }
  }

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1)
    }
  }

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link href="/catalog" className="text-black underline">
            Back to catalog
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-black mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Product Image Carousel */}
          <div className="w-full max-w-xl mx-auto">
            <div className="aspect-square bg-white rounded-lg overflow-hidden relative">
              {images.length > 0 ? (
                <ImageCarousel images={images} alt={product.name} autoPlay={true} interval={3000} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {message && (
              <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {message.text}
              </div>
            )}

            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-gray-100 text-sm rounded text-black">
                {product.category}
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-4 text-black">{product.name}</h1>
            <p className="text-3xl font-bold mb-6 text-black">{formatPrice(product.price)}</p>
            
            {product.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2 text-black">Description</h2>
                <p className="text-black">{product.description}</p>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2 text-black">Availability</h2>
              <p className={`text-lg font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
              </p>
            </div>

            {product.stock > 0 && (
              <>
                {/* Size Selection */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-3 text-black">Size</h2>
                  <div className="flex flex-wrap gap-2">
                    {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-6 py-2 border-2 rounded-lg font-semibold transition ${
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

                {/* Color Selection */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-3 text-black">Color</h2>
                  <div className="flex flex-wrap gap-2">
                    {['Black', 'White', 'Navy', 'Gray', 'Beige'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-6 py-2 border-2 rounded-lg font-semibold transition ${
                          selectedColor === color
                            ? 'border-black bg-black text-white'
                            : 'border-gray-300 text-black hover:border-black'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity Selector */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-3 text-black">Quantity</h2>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-black disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-bold text-black w-12 text-center">{quantity}</span>
                    <button
                      onClick={incrementQuantity}
                      disabled={quantity >= product.stock}
                      className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-black disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">Max: {product.stock}</span>
                  </div>
                </div>
              </>
            )}

            {product.stock > 0 ? (
              <button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="w-full bg-black text-white py-4 rounded-lg font-semibold hover:bg-gray-800 transition disabled:bg-gray-400 flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>{addingToCart ? 'Adding...' : 'Add to Cart'}</span>
              </button>
            ) : (
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 py-4 rounded-lg font-semibold cursor-not-allowed"
              >
                Out of Stock
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
