'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { productService } from '@/lib/products'
import { Product } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MultiImageUpload from '@/components/MultiImageUpload'

const categories = ['Tops', 'Bottoms', 'Accessories', 'Outerwear']

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [productId, setProductId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'Tops',
    image_url: '',
    images: [] as string[]
  })

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
      
      // Load product images
      const images = await productService.getProductImages(productId)
      const imageUrls = images.map((img: any) => img.image_url)
      
      setProduct(data)
      setFormData({
        name: data.name,
        description: data.description || '',
        price: data.price.toString(),
        stock: data.stock.toString(),
        category: data.category,
        image_url: data.image_url || '',
        images: imageUrls.length > 0 ? imageUrls : (data.image_url ? [data.image_url] : [])
      })
    } catch (error) {
      console.error('Error loading product:', error)
      alert('Failed to load product')
      router.push('/admin/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await productService.updateProduct(productId, {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        category: formData.category,
        image_url: formData.images[0] || null // Use first image as main
      })

      // Save/update product images
      if (formData.images.length > 0) {
        await productService.saveProductImages(productId, formData.images)
      }

      alert('Product updated successfully!')
      router.push('/admin/dashboard')
    } catch (error: any) {
      console.error('Error updating product:', error)
      alert('Failed to update product: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        <p className="mt-4 text-gray-600">Loading product...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Product not found</p>
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/admin/dashboard"
        className="flex items-center space-x-2 text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold mb-6 text-black">Edit Product</h2>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2 text-black">
              Product Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-2">
                Price (IDR) *
              </label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
              />
            </div>

            <div>
              <label htmlFor="stock" className="block text-sm font-medium mb-2">
                Stock *
              </label>
              <input
                id="stock"
                name="stock"
                type="number"
                value={formData.stock}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-2">
              Category *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <MultiImageUpload
            productId={productId}
            onImagesChange={(urls) => setFormData({ ...formData, images: urls })}
            initialImages={formData.images}
          />

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 btn-primary-animated"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href="/admin/dashboard"
              className="flex-1 py-3 text-center btn-secondary-animated"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
