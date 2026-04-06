'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, Image as ImageIcon, X, Plus, Pencil, Trash2 } from 'lucide-react'
import { getImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/lib/i18n'

interface LandingPageImage {
  id: string
  position: number
  image_url: string
  created_at?: string
  updated_at?: string
}

interface Category {
  id: string
  name: string
  description?: string
  created_at?: string
  updated_at?: string
}

const MAX_LANDING_IMAGES = 6
const LANDING_IMAGE_SLOTS = Array.from({ length: MAX_LANDING_IMAGES }, (_, index) => index + 1)
const LANDING_IMAGE_SIZE_GUIDE = [
  { count: 1, ratio: '16:9', size: '2560 x 1440 px' },
  { count: 2, ratio: '4:5', size: '1600 x 2000 px' },
  { count: 3, ratio: '2:3', size: '1400 x 2100 px' },
  { count: 4, ratio: '16:9', size: '1920 x 1080 px' },
  { count: 5, ratio: '4:3', size: '1600 x 1200 px' },
  { count: 6, ratio: '4:3', size: '1600 x 1200 px' }
]

export default function LandingPageManager() {
  const { language } = useLanguage()
  const [images, setImages] = useState<LandingPageImage[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const text = {
    failedLoadImages: language === 'en' ? 'Failed to load images' : 'Gagal memuat gambar',
    categoriesTableMissing:
      language === 'en'
        ? 'Categories table not found. Please run categories-schema.sql in Supabase SQL Editor first.'
        : 'Tabel kategori tidak ditemukan. Jalankan categories-schema.sql di Supabase SQL Editor terlebih dahulu.',
    imageUploadSuccess: (position: number) =>
      language === 'en' ? `Image ${position} uploaded successfully!` : `Gambar ${position} berhasil diunggah!`,
    imageRemovedSuccess: (position: number) =>
      language === 'en' ? `Image ${position} removed successfully!` : `Gambar ${position} berhasil dihapus!`,
    failedUploadImage: language === 'en' ? 'Failed to upload image' : 'Gagal mengunggah gambar',
    failedDeleteImage: language === 'en' ? 'Failed to delete image' : 'Gagal menghapus gambar',
    selectImageFile: language === 'en' ? 'Please select an image file' : 'Silakan pilih file gambar',
    imageSizeLimit: language === 'en' ? 'Image size must be less than 5MB' : 'Ukuran gambar harus kurang dari 5MB',
    categoryNameRequired: language === 'en' ? 'Category name is required' : 'Nama kategori wajib diisi',
    failedUpdateCategory: language === 'en' ? 'Failed to update category' : 'Gagal memperbarui kategori',
    categoryUpdated: language === 'en' ? 'Category updated successfully!' : 'Kategori berhasil diperbarui!',
    categoriesRunSchemaFirst:
      language === 'en'
        ? 'Categories table not found. Please run categories-schema.sql in Supabase first.'
        : 'Tabel kategori tidak ditemukan. Jalankan categories-schema.sql di Supabase terlebih dahulu.',
    duplicateCategory:
      language === 'en'
        ? 'A category with this name already exists.'
        : 'Kategori dengan nama ini sudah ada.',
    failedAddCategory: language === 'en' ? 'Failed to add category' : 'Gagal menambahkan kategori',
    categoryAdded: language === 'en' ? 'Category added successfully!' : 'Kategori berhasil ditambahkan!',
    failedSaveCategory: language === 'en' ? 'Failed to save category' : 'Gagal menyimpan kategori',
    failedDeleteCategory: language === 'en' ? 'Failed to delete category' : 'Gagal menghapus kategori',
    categoryDeleted: language === 'en' ? 'Category deleted successfully!' : 'Kategori berhasil dihapus!',
    pageTitle: language === 'en' ? 'Landing Page Images' : 'Gambar Landing Page',
    pageSubtitle:
      language === 'en'
        ? 'Upload and manage landing page background images dynamically (1-6 images)'
        : 'Upload dan kelola gambar latar landing page secara dinamis (1-6 gambar)',
    imageLabel: (position: number) => (language === 'en' ? `Image ${position}` : `Gambar ${position}`),
    landingImageAlt: (position: number) =>
      language === 'en' ? `Landing page image ${position}` : `Gambar landing page ${position}`,
    uploading: language === 'en' ? 'Uploading...' : 'Mengunggah...',
    changeImage: language === 'en' ? 'Change Image' : 'Ganti Gambar',
    uploadImage: language === 'en' ? 'Upload Image' : 'Upload Gambar',
    removeImageAria: (position: number) => (language === 'en' ? `Remove image ${position}` : `Hapus gambar ${position}`),
    lastUpdated: language === 'en' ? 'Last updated' : 'Terakhir diperbarui',
    tipsTitle: language === 'en' ? 'Tips:' : 'Tips:',
    tipUploadCount: language === 'en' ? 'You can upload 1 to 6 images' : 'Anda bisa mengunggah 1 hingga 6 gambar',
    tipAdaptiveLayout:
      language === 'en'
        ? 'Landing page background layout adjusts automatically based on image count'
        : 'Layout background landing page otomatis menyesuaikan jumlah gambar',
    tipFollowSizeGuide: language === 'en' ? 'Follow the size guide below for best fit' : 'Ikuti panduan ukuran di bawah agar lebih pas',
    tipMaxFile: language === 'en' ? 'Maximum file size: 5MB' : 'Ukuran file maksimum: 5MB',
    tipFormats: language === 'en' ? 'Supported formats: JPG, PNG, WebP' : 'Format didukung: JPG, PNG, WebP',
    tipSafeArea:
      language === 'en'
        ? 'Keep main object in center safe area (middle 60%) to reduce cropping risk'
        : 'Simpan objek utama di area aman tengah (60% bagian tengah) untuk mengurangi risiko terpotong',
    tipConsistentTone:
      language === 'en'
        ? 'Use similar tone/lighting for a more consistent look'
        : 'Gunakan tone/pencahayaan yang serupa agar tampilan lebih konsisten',
    sizeGuideTitle:
      language === 'en'
        ? 'Recommended Image Size by Total Upload'
        : 'Rekomendasi Ukuran Gambar Berdasarkan Total Upload',
    sizeGuideSubtitle:
      language === 'en'
        ? 'These sizes help reduce cropping when the landing grid changes on desktop and mobile.'
        : 'Ukuran ini membantu mengurangi crop saat grid landing berubah di desktop dan mobile.',
    tableTotalImages: language === 'en' ? 'Total Images' : 'Total Gambar',
    tableIdealRatio: language === 'en' ? 'Ideal Ratio' : 'Rasio Ideal',
    tableSuggestedSize: language === 'en' ? 'Suggested Per-Image Size' : 'Saran Ukuran per Gambar',
    imageCount: (count: number) => (language === 'en' ? `${count} image${count > 1 ? 's' : ''}` : `${count} gambar`),
    productCategories: language === 'en' ? 'Product Categories' : 'Kategori Produk',
    categoriesSubtitle: language === 'en' ? 'Manage product categories for your store' : 'Kelola kategori produk untuk toko Anda',
    addCategory: language === 'en' ? 'Add Category' : 'Tambah Kategori',
    setupRequired: language === 'en' ? 'Setup Required' : 'Perlu Setup',
    setupCategoriesHelp:
      language === 'en'
        ? 'If this is your first time using categories, please run the SQL schema file first:'
        : 'Jika ini pertama kali Anda menggunakan kategori, jalankan file schema SQL berikut terlebih dahulu:',
    setupStep1: language === 'en' ? 'Open Supabase Dashboard -> SQL Editor' : 'Buka Supabase Dashboard -> SQL Editor',
    setupStep2: language === 'en' ? 'Copy and paste the content from' : 'Salin lalu tempel isi dari',
    setupStep3: language === 'en' ? 'Click "Run" to create the categories table' : 'Klik "Run" untuk membuat tabel kategori',
    setupStep4: language === 'en' ? 'Refresh this page' : 'Refresh halaman ini',
    edit: language === 'en' ? 'Edit' : 'Ubah',
    noCategories:
      language === 'en'
        ? 'No categories yet. Click "Add Category" to create one.'
        : 'Belum ada kategori. Klik "Tambah Kategori" untuk membuat kategori baru.',
    editCategory: language === 'en' ? 'Edit Category' : 'Ubah Kategori',
    addNewCategory: language === 'en' ? 'Add New Category' : 'Tambah Kategori Baru',
    categoryName: language === 'en' ? 'Category Name *' : 'Nama Kategori *',
    categoryNamePlaceholder: language === 'en' ? 'e.g., T-Shirts' : 'contoh: Kaos',
    descriptionOptional: language === 'en' ? 'Description (Optional)' : 'Deskripsi (Opsional)',
    categoryDescPlaceholder:
      language === 'en' ? 'Brief description of this category' : 'Deskripsi singkat untuk kategori ini',
    cancel: language === 'en' ? 'Cancel' : 'Batal',
    update: language === 'en' ? 'Update' : 'Perbarui',
    deleteCategory: language === 'en' ? 'Delete Category' : 'Hapus Kategori',
    deleteCategoryConfirm:
      language === 'en'
        ? 'Are you sure you want to delete this category? This action cannot be undone.'
        : 'Yakin ingin menghapus kategori ini? Tindakan ini tidak dapat dibatalkan.',
    delete: language === 'en' ? 'Delete' : 'Hapus',
  }
  
  // Category modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadImages()
    loadCategories()
  }, [])

  const loadImages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('landing_page_images')
        .select('*')
        .order('position', { ascending: true })
        .limit(MAX_LANDING_IMAGES)

      if (error) throw error
      setImages(data || [])
    } catch (error: any) {
      console.error('Error loading images:', error)
      setMessage({ type: 'error', text: text.failedLoadImages })
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading categories:', error)
        // Show error if table doesn't exist
        if (error.message?.includes('relation "categories" does not exist')) {
          setMessage({ 
            type: 'error', 
            text: text.categoriesTableMissing 
          })
        }
        return
      }
      setCategories(data || [])
    } catch (error: any) {
      console.error('Error loading categories:', error)
    }
  }

  const handleImageUpload = async (position: number, file: File) => {
    try {
      setUploading(position)
      setMessage(null)

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `landing-${position}-${Date.now()}.${fileExt}`
      const filePath = `landing/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      // Update or insert image URL in database
      const existingImage = images.find(img => img.position === position)
      
      if (existingImage) {
        const { error: updateError } = await supabase
          .from('landing_page_images')
          .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('position', position)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('landing_page_images')
          .insert({ position, image_url: publicUrl })

        if (insertError) throw insertError
      }

      setMessage({ type: 'success', text: text.imageUploadSuccess(position) })
      loadImages()
    } catch (error: any) {
      console.error('Error uploading image:', error)
      setMessage({ type: 'error', text: error.message || text.failedUploadImage })
    } finally {
      setUploading(null)
    }
  }

  const handleImageDelete = async (position: number) => {
    try {
      setUploading(position)
      setMessage(null)

      const { error } = await supabase
        .from('landing_page_images')
        .delete()
        .eq('position', position)

      if (error) throw error

      setMessage({ type: 'success', text: text.imageRemovedSuccess(position) })
      loadImages()
    } catch (error: any) {
      console.error('Error deleting image:', error)
      setMessage({ type: 'error', text: error.message || text.failedDeleteImage })
    } finally {
      setUploading(null)
    }
  }

  const handleFileSelect = (position: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: text.selectImageFile })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: text.imageSizeLimit })
      return
    }

    handleImageUpload(position, file)
  }

  // Category Management Functions
  const openAddCategoryModal = () => {
    setEditingCategory(null)
    setCategoryName('')
    setCategoryDescription('')
    setShowCategoryModal(true)
  }

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setCategoryDescription(category.description || '')
    setShowCategoryModal(true)
  }

  const closeCategoryModal = () => {
    setShowCategoryModal(false)
    setEditingCategory(null)
    setCategoryName('')
    setCategoryDescription('')
  }

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      setMessage({ type: 'error', text: text.categoryNameRequired })
      return
    }

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({ 
            name: categoryName.trim(), 
            description: categoryDescription.trim() 
          })
          .eq('id', editingCategory.id)

        if (error) {
          console.error('Update error:', error)
          throw new Error(error.message || text.failedUpdateCategory)
        }
        setMessage({ type: 'success', text: text.categoryUpdated })
      } else {
        // Insert new category
        const { error } = await supabase
          .from('categories')
          .insert({ 
            name: categoryName.trim(), 
            description: categoryDescription.trim() 
          })

        if (error) {
          console.error('Insert error:', error)
          if (error.message?.includes('relation "categories" does not exist')) {
            throw new Error(text.categoriesRunSchemaFirst)
          }
          if (error.message?.includes('duplicate key')) {
            throw new Error(text.duplicateCategory)
          }
          throw new Error(error.message || text.failedAddCategory)
        }
        setMessage({ type: 'success', text: text.categoryAdded })
      }

      loadCategories()
      closeCategoryModal()
    } catch (error: any) {
      console.error('Error saving category:', error)
      setMessage({ type: 'error', text: error.message || text.failedSaveCategory })
    }
  }

  const openDeleteModal = (categoryId: string) => {
    setCategoryToDelete(categoryId)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setCategoryToDelete(null)
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete)

      if (error) {
        console.error('Delete error:', error)
        throw new Error(error.message || text.failedDeleteCategory)
      }

      setMessage({ type: 'success', text: text.categoryDeleted })
      loadCategories()
      closeDeleteModal()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      setMessage({ type: 'error', text: error.message || text.failedDeleteCategory })
      closeDeleteModal()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">{text.pageTitle}</h1>
        <p className="text-gray-600">{text.pageSubtitle}</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {LANDING_IMAGE_SLOTS.map((position) => {
          const image = images.find(img => img.position === position)
          const isUploading = uploading === position

          return (
            <div key={position} className="border-2 border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-bold text-black mb-4">{text.imageLabel(position)}</h3>
              
              {/* Image Preview */}
              <div className="aspect-3/4 bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
                {image?.image_url ? (
                  <img
                    src={getImageUrl(image.image_url)}
                    alt={text.landingImageAlt(position)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-16 h-16" />
                  </div>
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex gap-2">
                <label className={`flex-1 py-3 px-4 rounded-lg font-semibold text-center cursor-pointer transition flex items-center justify-center space-x-2 ${
                  isUploading 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-black text-white hover:bg-gray-800'
                }`}>
                  <Upload className="w-5 h-5" />
                  <span>{isUploading ? text.uploading : image ? text.changeImage : text.uploadImage}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => handleFileSelect(position, e)}
                  />
                </label>

                {image && (
                  <button
                    type="button"
                    onClick={() => handleImageDelete(position)}
                    disabled={isUploading}
                    className="px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:bg-red-300 disabled:cursor-not-allowed"
                    aria-label={text.removeImageAria(position)}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {image && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {text.lastUpdated}: {new Date(image.updated_at || image.created_at || Date.now()).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID')}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 {text.tipsTitle}</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• {text.tipUploadCount}</li>
          <li>• {text.tipAdaptiveLayout}</li>
          <li>• {text.tipFollowSizeGuide}</li>
          <li>• {text.tipMaxFile}</li>
          <li>• {text.tipFormats}</li>
          <li>• {text.tipSafeArea}</li>
          <li>• {text.tipConsistentTone}</li>
        </ul>
      </div>

      <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-black mb-2">{text.sizeGuideTitle}</h3>
        <p className="text-sm text-gray-600 mb-4">
          {text.sizeGuideSubtitle}
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-700">
                <th className="py-2 pr-4 font-semibold">{text.tableTotalImages}</th>
                <th className="py-2 pr-4 font-semibold">{text.tableIdealRatio}</th>
                <th className="py-2 font-semibold">{text.tableSuggestedSize}</th>
              </tr>
            </thead>
            <tbody>
              {LANDING_IMAGE_SIZE_GUIDE.map((guide) => (
                <tr key={guide.count} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-2 pr-4 text-gray-900">{text.imageCount(guide.count)}</td>
                  <td className="py-2 pr-4 text-gray-700">{guide.ratio}</td>
                  <td className="py-2 text-gray-700">{guide.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Management Section */}
      <div className="mt-12 border-t pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-black mb-1">{text.productCategories}</h2>
            <p className="text-gray-600">{text.categoriesSubtitle}</p>
          </div>
          <button
            onClick={openAddCategoryModal}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {text.addCategory}
          </button>
        </div>

        {/* Setup Instructions if no categories */}
        {categories.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ {text.setupRequired}</h4>
            <p className="text-sm text-yellow-800 mb-2">
              {text.setupCategoriesHelp}
            </p>
            <ol className="text-sm text-yellow-800 list-decimal list-inside space-y-1">
              <li>{text.setupStep1}</li>
              <li>{text.setupStep2} <code className="bg-yellow-100 px-1 rounded">categories-schema.sql</code></li>
              <li>{text.setupStep3}</li>
              <li>{text.setupStep4}</li>
            </ol>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div key={category.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <h3 className="font-bold text-black text-lg mb-1">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => openEditCategoryModal(category)}
                  className="flex-1 bg-gray-100 text-black px-3 py-2 rounded text-sm hover:bg-gray-200 transition flex items-center justify-center gap-1"
                >
                  <Pencil className="w-4 h-4" />
                  {text.edit}
                </button>
                <button
                  onClick={() => openDeleteModal(category.id)}
                  className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            {text.noCategories}
          </div>
        )}
      </div>

      {/* Category Add/Edit Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-4">
              {editingCategory ? text.editCategory : text.addNewCategory}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {text.categoryName}
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  placeholder={text.categoryNamePlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {text.descriptionOptional}
                </label>
                <textarea
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  placeholder={text.categoryDescPlaceholder}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={closeCategoryModal}
                className="px-4 py-2 bg-gray-100 text-black rounded hover:bg-gray-200 transition font-medium"
              >
                {text.cancel}
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition font-medium"
              >
                {editingCategory ? text.update : text.addCategory}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-4">
              {text.deleteCategory}
            </h3>
            <p className="text-gray-600 mb-6">
              {text.deleteCategoryConfirm}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 bg-gray-100 text-black rounded hover:bg-gray-200 transition font-medium"
              >
                {text.cancel}
              </button>
              <button
                onClick={handleDeleteCategory}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
              >
                {text.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
