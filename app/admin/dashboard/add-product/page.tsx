'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { productService } from '@/lib/products'
import { useLanguage } from '@/lib/i18n'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MultiImageUpload from '@/components/MultiImageUpload'

const categories = ['Tops', 'Bottoms', 'Accessories', 'Outerwear']

export default function AddProductPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    name_id: '',
    description: '',
    description_id: '',
    price: '',
    stock: '',
    category: 'Tops',
    image_url: '',
    images: [] as string[]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const product = await productService.createProduct({
        name: formData.name,
        name_id: formData.name_id || null,
        description: formData.description || null,
        description_id: formData.description_id || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        category: formData.category,
        image_url: formData.images[0] || null // Use first image as main
      })

      // Save additional images to product_images table
      if (formData.images.length > 0 && product.id) {
        await productService.saveProductImages(product.id, formData.images)
      }

      alert(t('adminProduct.createSuccess'))
      router.push('/admin/dashboard')
    } catch (error: any) {
      console.error('Error creating product:', error)
      alert(t('adminProduct.createError') + ': ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
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
        <h2 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6 text-black">Add New Product</h2>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6 space-y-4 lg:space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2 text-black">
              Product Name (English) *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
              placeholder="e.g., Bearion Absolute Tees"
            />
          </div>

          <div>
            <label htmlFor="name_id" className="block text-sm font-medium mb-2 text-black">
              Product Name (Indonesian)
            </label>
            <input
              id="name_id"
              name="name_id"
              type="text"
              value={formData.name_id}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
              placeholder="Contoh: Kaos Bearion Absolute"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2 text-black">
              Description (English)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
              placeholder="Product description..."
            />
          </div>

          <div>
            <label htmlFor="description_id" className="block text-sm font-medium mb-2 text-black">
              Description (Indonesian)
            </label>
            <textarea
              id="description_id"
              name="description_id"
              value={formData.description_id}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
              placeholder="Deskripsi produk..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-2 text-black">
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
                placeholder="380000"
              />
            </div>

            <div>
              <label htmlFor="stock" className="block text-sm font-medium mb-2 text-black">
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
                placeholder="100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-2 text-black">
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
            onImagesChange={(urls) => setFormData({ ...formData, images: urls })}
            initialImages={formData.images}
          />

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 btn-primary-animated"
            >
              {loading ? 'Creating...' : 'Create Product'}
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
