'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, Image as ImageIcon, Save, X, Plus, Pencil, Trash2 } from 'lucide-react'
import { getImageUrl } from '@/lib/image-utils'

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

export default function LandingPageManager() {
  const [images, setImages] = useState<LandingPageImage[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
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

      if (error) throw error
      setImages(data || [])
    } catch (error: any) {
      console.error('Error loading images:', error)
      setMessage({ type: 'error', text: 'Failed to load images' })
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
            text: 'Categories table not found. Please run categories-schema.sql in Supabase SQL Editor first.' 
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

      setMessage({ type: 'success', text: `Image ${position} uploaded successfully!` })
      loadImages()
    } catch (error: any) {
      console.error('Error uploading image:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to upload image' })
    } finally {
      setUploading(null)
    }
  }

  const handleFileSelect = (position: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' })
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
      setMessage({ type: 'error', text: 'Category name is required' })
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
          throw new Error(error.message || 'Failed to update category')
        }
        setMessage({ type: 'success', text: 'Category updated successfully!' })
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
            throw new Error('Categories table not found. Please run categories-schema.sql in Supabase first.')
          }
          if (error.message?.includes('duplicate key')) {
            throw new Error('A category with this name already exists.')
          }
          throw new Error(error.message || 'Failed to add category')
        }
        setMessage({ type: 'success', text: 'Category added successfully!' })
      }

      loadCategories()
      closeCategoryModal()
    } catch (error: any) {
      console.error('Error saving category:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to save category' })
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
        throw new Error(error.message || 'Failed to delete category')
      }

      setMessage({ type: 'success', text: 'Category deleted successfully!' })
      loadCategories()
      closeDeleteModal()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to delete category' })
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
        <h1 className="text-3xl font-bold text-black mb-2">Landing Page Images</h1>
        <p className="text-gray-600">Upload and manage images for the landing page background (3 images)</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((position) => {
          const image = images.find(img => img.position === position)
          const isUploading = uploading === position

          return (
            <div key={position} className="border-2 border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-bold text-black mb-4">Image {position}</h3>
              
              {/* Image Preview */}
              <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
                {image?.image_url ? (
                  <img
                    src={getImageUrl(image.image_url)}
                    alt={`Landing page image ${position}`}
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
              <label className={`w-full py-3 px-4 rounded-lg font-semibold text-center cursor-pointer transition flex items-center justify-center space-x-2 ${
                isUploading 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-black text-white hover:bg-gray-800'
              }`}>
                <Upload className="w-5 h-5" />
                <span>{isUploading ? 'Uploading...' : image ? 'Change Image' : 'Upload Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => handleFileSelect(position, e)}
                />
              </label>

              {image && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Last updated: {new Date(image.updated_at || image.created_at || Date.now()).toLocaleDateString()}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tips:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Recommended image ratio: 3:4 (portrait)</li>
          <li>• Maximum file size: 5MB</li>
          <li>• Supported formats: JPG, PNG, WebP</li>
          <li>• Images will be displayed in a 3-column grid on the landing page</li>
        </ul>
      </div>

      {/* Category Management Section */}
      <div className="mt-12 border-t pt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-black mb-1">Product Categories</h2>
            <p className="text-gray-600">Manage product categories for your store</p>
          </div>
          <button
            onClick={openAddCategoryModal}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Category
          </button>
        </div>

        {/* Setup Instructions if no categories */}
        {categories.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Setup Required</h4>
            <p className="text-sm text-yellow-800 mb-2">
              If this is your first time using categories, please run the SQL schema file first:
            </p>
            <ol className="text-sm text-yellow-800 list-decimal list-inside space-y-1">
              <li>Open Supabase Dashboard → SQL Editor</li>
              <li>Copy and paste the content from <code className="bg-yellow-100 px-1 rounded">categories-schema.sql</code></li>
              <li>Click "Run" to create the categories table</li>
              <li>Refresh this page</li>
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
                  Edit
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
            No categories yet. Click "Add Category" to create one.
          </div>
        )}
      </div>

      {/* Category Add/Edit Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  placeholder="e.g., T-Shirts"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-black"
                  placeholder="Brief description of this category"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={closeCategoryModal}
                className="px-4 py-2 bg-gray-100 text-black rounded hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition font-medium"
              >
                {editingCategory ? 'Update' : 'Add'} Category
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
              Delete Category
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this category? This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 bg-gray-100 text-black rounded hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
