'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { productService } from '@/lib/products'
import { useLanguage } from '@/lib/i18n'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MultiImageUpload from '@/components/MultiImageUpload'
import { supabase } from '@/lib/supabase'
import Notification from '@/components/Notification'
import { getErrorMessage } from '@/lib/errors'

interface Category {
  id: string
  name: string
  description?: string
}

export default function AddProductPage() {
  const router = useRouter()
  const { t, tr } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    name_id: '',
    description: '',
    description_id: '',
    price: '',
    sale_price: '',
    price_usd: '',
    stock: '',
    category: '',
    image_url: '',
    weight_grams: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    hs_code: '',
    images: [] as string[]
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setCategories(data || [])
      
      // Set first category as default
      if (data && data.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: data[0].name }))
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

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
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        price_usd: formData.price_usd ? parseFloat(formData.price_usd) : null,
        stock: parseInt(formData.stock),
        category: formData.category,
        image_url: formData.images[0] || null, // Use first image as main
        // Shipping dimensions. Null means "fall back to the store default",
        // which is why blanks are not coerced to zero.
        weight_grams: formData.weight_grams ? parseInt(formData.weight_grams) : null,
        length_cm: formData.length_cm ? parseFloat(formData.length_cm) : null,
        width_cm: formData.width_cm ? parseFloat(formData.width_cm) : null,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
        hs_code: formData.hs_code.trim() || null,
      })

      // Save additional images to product_images table
      if (formData.images.length > 0 && product.id) {
        await productService.saveProductImages(product.id, formData.images)
      }

      setNotification({ type: 'success', message: t('adminProduct.createSuccess') })
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 1500)
    } catch (error) {
      console.error('Error creating product:', error)
      setNotification({ type: 'error', message: t('adminProduct.createError') + ': ' + getErrorMessage(error) })
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
        className="inline-flex items-center space-x-2 text-gray-600 hover:text-black mb-6 min-h-11 py-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>{tr('Back to Dashboard', 'Kembali ke Dashboard')}</span>
      </Link>

      <div className="max-w-2xl">
        <h2 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6 text-black">{tr('Add New Product', 'Tambah Produk Baru')}</h2>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6 space-y-4 lg:space-y-6">
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
              placeholder={tr('e.g., Bearion Absolute Tees', 'contoh: Bearion Absolute Tees')}
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
              placeholder={tr('Product description...', 'Deskripsi produk...')}
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
                placeholder="380000"
              />
            </div>

            <div>
              <label htmlFor="sale_price" className="block text-sm font-medium mb-2 text-black">
                {tr('Sale Price (IDR)', 'Harga Diskon (IDR)')}
              </label>
              <input
                id="sale_price"
                name="sale_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.sale_price}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                placeholder="250000"
              />
              <p className="text-xs text-gray-500 mt-1">
                {tr(
                  'Optional. Enter a discounted price to show the original price crossed out.',
                  'Opsional. Masukkan harga diskon agar harga asli dicoret.'
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
                placeholder="100"
              />
            </div>
          </div>

          {/* Shipping dimensions. Couriers bill the larger of actual and
              volumetric weight, so leaving the box size out is how a quote of
              Rp 20.000 turns into an invoice for Rp 70.000. */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-base font-semibold text-black mb-1">
              {tr('Shipping Dimensions', 'Dimensi Pengiriman')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {tr(
                'Used to calculate shipping cost. Couriers charge for the greater of actual and volumetric weight, so packed box size matters.',
                'Dipakai untuk menghitung ongkir. Kurir menagih berdasarkan berat asli atau volumetrik — mana yang lebih besar — jadi ukuran dus penting.'
              )}
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="weight_grams" className="block text-sm font-medium mb-2 text-black">
                  {tr('Weight (g)', 'Berat (g)')}
                </label>
                <input
                  id="weight_grams"
                  name="weight_grams"
                  type="number"
                  min="0"
                  value={formData.weight_grams}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                  placeholder="500"
                />
              </div>
              <div>
                <label htmlFor="length_cm" className="block text-sm font-medium mb-2 text-black">
                  {tr('Length (cm)', 'Panjang (cm)')}
                </label>
                <input
                  id="length_cm"
                  name="length_cm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.length_cm}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                  placeholder="30"
                />
              </div>
              <div>
                <label htmlFor="width_cm" className="block text-sm font-medium mb-2 text-black">
                  {tr('Width (cm)', 'Lebar (cm)')}
                </label>
                <input
                  id="width_cm"
                  name="width_cm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.width_cm}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                  placeholder="25"
                />
              </div>
              <div>
                <label htmlFor="height_cm" className="block text-sm font-medium mb-2 text-black">
                  {tr('Height (cm)', 'Tinggi (cm)')}
                </label>
                <input
                  id="height_cm"
                  name="height_cm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.height_cm}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                  placeholder="10"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="hs_code" className="block text-sm font-medium mb-2 text-black">
                {tr('HS Code (for international shipping)', 'Kode HS (untuk kirim luar negeri)')}
              </label>
              <input
                id="hs_code"
                name="hs_code"
                type="text"
                value={formData.hs_code}
                onChange={handleChange}
                className="w-full max-w-xs px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                placeholder="6109.10"
              />
              <p className="text-xs text-gray-500 mt-1">
                {tr(
                  'Optional. Goes on the customs form; without it a parcel can be held at the border.',
                  'Opsional. Dipakai di formulir bea cukai; tanpa ini paket bisa tertahan di perbatasan.'
                )}
              </p>
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
              {tr('Product Images *', 'Gambar Produk *')}
            </label>
            <MultiImageUpload
              onImagesChange={(urls) => setFormData((prev) => ({ ...prev, images: urls }))}
              initialImages={formData.images}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 btn-primary-animated"
            >
              {loading ? tr('Creating...', 'Membuat...') : tr('Create Product', 'Buat Produk')}
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
