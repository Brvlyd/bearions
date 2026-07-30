'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { productService } from '@/lib/products'
import { Product, supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MultiImageUpload from '@/components/MultiImageUpload'
import Notification from '@/components/Notification'
import { getErrorMessage } from '@/lib/errors'

interface Category {
  id: string
  name: string
  description?: string
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { tr } = useLanguage()
  const [productId, setProductId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    name_id: '',
    description: '',
    description_id: '',
    price: '',
    price_usd: '',
    stock: '',
    category: '',
    image_url: '',
    images: [] as string[]
  })

  useEffect(() => {
    params.then(p => setProductId(p.id))
  }, [params])

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (productId) {
      loadProduct()
    }
  }, [productId])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadProduct = async () => {
    try {
      setLoading(true)
      const data = await productService.getProductById(productId)
      
      // Load product images
      const images = await productService.getProductImages(productId)
      const imageUrls = (images || []).map((img: { image_url: string }) => img.image_url)
      
      setProduct(data)
      setFormData({
        name: data.name,
        name_id: data.name_id || '',
        description: data.description || '',
        description_id: data.description_id || '',
        price: data.price.toString(),
        price_usd: data.price_usd != null ? data.price_usd.toString() : '',
        stock: data.stock.toString(),
        category: data.category,
        image_url: data.image_url || '',
        images: imageUrls.length > 0 ? imageUrls : (data.image_url ? [data.image_url] : [])
      })
    } catch (error) {
      console.error('Error loading product:', error)
      setNotification({ type: 'error', message: tr('Failed to load product', 'Gagal memuat produk') })
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 2000)
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
        name_id: formData.name_id || null,
        description: formData.description || null,
        description_id: formData.description_id || null,
        price: parseFloat(formData.price),
        price_usd: formData.price_usd ? parseFloat(formData.price_usd) : null,
        stock: parseInt(formData.stock),
        category: formData.category,
        image_url: formData.images[0] || null // Use first image as main
      })

      // Save/update product images
      if (formData.images.length > 0) {
        await productService.saveProductImages(productId, formData.images)
      }

      setNotification({ type: 'success', message: tr('Product updated successfully!', 'Produk berhasil diperbarui!') })
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 1500)
    } catch (error) {
      console.error('Error updating product:', error)
      setNotification({ type: 'error', message: tr('Failed to update product', 'Gagal memperbarui produk') + ': ' + getErrorMessage(error) })
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
        <p className="mt-4 text-gray-600">{tr('Loading product...', 'Memuat produk...')}</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{tr('Product not found', 'Produk tidak ditemukan')}</p>
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
        <span>{tr('Back to Dashboard', 'Kembali ke Dashboard')}</span>
      </Link>

      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold mb-6 text-black">{tr('Edit Product', 'Ubah Produk')}</h2>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2 text-black">
              {tr('Product Name (English) *', 'Nama Produk (Inggris) *')}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
            />
          </div>

          <div>
            <label htmlFor="name_id" className="block text-sm font-medium mb-2 text-black">
              {tr('Product Name (Indonesian)', 'Nama Produk (Indonesia)')}
            </label>
            <input
              id="name_id"
              name="name_id"
              type="text"
              value={formData.name_id}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
              placeholder={tr('Example: Kaos Bearion Absolute', 'Contoh: Kaos Bearion Absolute')}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2 text-black">
              {tr('Description (English)', 'Deskripsi (Inggris)')}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
            />
          </div>

          <div>
            <label htmlFor="description_id" className="block text-sm font-medium mb-2 text-black">
              {tr('Description (Indonesian)', 'Deskripsi (Indonesia)')}
            </label>
            <textarea
              id="description_id"
              name="description_id"
              value={formData.description_id}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
              placeholder={tr('Product description in Indonesian...', 'Deskripsi produk...')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-2 text-black">
                {tr('Price (IDR) *', 'Harga (IDR) *')}
              </label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
              />
            </div>

            <div>
              <label htmlFor="price_usd" className="block text-sm font-medium mb-2 text-black">
                {tr('Price (USD)', 'Harga (USD)')}
              </label>
              <input
                id="price_usd"
                name="price_usd"
                type="number"
                step="0.01"
                min="0"
                value={formData.price_usd}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                placeholder="25.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                {tr(
                  'Optional. Set by hand — it is not converted from IDR. Leave empty to show the IDR price to English visitors.',
                  'Opsional. Diisi manual — tidak dikonversi dari IDR. Kosongkan agar pengunjung bahasa Inggris tetap melihat harga IDR.'
                )}
              </p>
            </div>

            <div>
              <label htmlFor="stock" className="block text-sm font-medium mb-2 text-black">
                {tr('Stock *', 'Stok *')}
              </label>
              <input
                id="stock"
                name="stock"
                type="number"
                value={formData.stock}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
              />
            </div>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-2 text-black">
              {tr('Category *', 'Kategori *')}
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
            >
              {categories.length === 0 ? (
                <option value="">{tr('Loading categories...', 'Memuat kategori...')}</option>
              ) : (
                categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-black">
              {tr('Product Images', 'Gambar Produk')}
            </label>
            <MultiImageUpload
              productId={productId}
              onImagesChange={(urls) => setFormData({ ...formData, images: urls })}
              initialImages={formData.images}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 btn-primary-animated"
            >
              {saving ? tr('Saving...', 'Menyimpan...') : tr('Save Changes', 'Simpan Perubahan')}
            </button>
            <Link
              href="/admin/dashboard"
              className="flex-1 py-3 text-center btn-secondary-animated"
            >
              {tr('Cancel', 'Batal')}
            </Link>
          </div>
        </form>
      </div>

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}
