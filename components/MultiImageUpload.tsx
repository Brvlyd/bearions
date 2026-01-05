'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, X, Image as ImageIcon, GripVertical } from 'lucide-react'
import Image from 'next/image'

interface MultiImageUploadProps {
  productId?: string
  onImagesChange: (urls: string[]) => void
  initialImages?: string[]
}

export default function MultiImageUpload({ productId, onImagesChange, initialImages = [] }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [images, setImages] = useState<string[]>(initialImages)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const uploadFile = async (file: File): Promise<string> => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload an image file')
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image size should be less than 5MB')
    }

    // Create unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `products/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadMultipleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files.length > 0) {
      await uploadMultipleFiles(Array.from(e.target.files))
    }
  }

  const uploadMultipleFiles = async (files: File[]) => {
    setUploading(true)
    setError('')

    try {
      const uploadPromises = files.map(file => uploadFile(file))
      const uploadedUrls = await Promise.all(uploadPromises)
      
      const newImages = [...images, ...uploadedUrls]
      setImages(newImages)
      onImagesChange(newImages)
    } catch (error: any) {
      console.error('Upload error:', error)
      setError(error.message || 'Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async (index: number) => {
    const imageUrl = images[index]
    
    // Try to delete from storage if it's a Supabase URL
    if (imageUrl && imageUrl.includes('supabase')) {
      try {
        const urlParts = imageUrl.split('/product-images/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          await supabase.storage
            .from('product-images')
            .remove([`products/${filePath.split('/').pop()}`])
        }
      } catch (error) {
        console.error('Error removing file:', error)
      }
    }
    
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    onImagesChange(newImages)
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)
    setImages(newImages)
    onImagesChange(newImages)
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-black">
        Product Images
      </label>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative w-full h-48 border-2 border-gray-300 rounded-lg bg-gray-50 p-3">
                <div className="relative w-full h-full">
                  <Image
                    src={url}
                    alt={`Product ${index + 1}`}
                    fill
                    className="object-contain rounded"
                    onError={() => {
                      setError('Failed to load image')
                    }}
                  />
                </div>
                
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-lg opacity-0 group-hover:opacity-100"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Reorder buttons */}
                <div className="absolute top-1 left-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveImage(index, index - 1)}
                      className="bg-black/70 text-white p-1 rounded hover:bg-black transition"
                      title="Move left"
                    >
                      <GripVertical className="w-3 h-3 rotate-90" />
                    </button>
                  )}
                  {index < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveImage(index, index + 1)}
                      className="bg-black/70 text-white p-1 rounded hover:bg-black transition"
                      title="Move right"
                    >
                      <GripVertical className="w-3 h-3 -rotate-90" />
                    </button>
                  )}
                </div>

                {/* Image number badge */}
                <div className="absolute bottom-1 left-1 bg-black/70 text-white px-2 py-0.5 rounded text-xs">
                  {index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition ${
          dragActive
            ? 'border-black bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
          multiple
        />
        
        <div className="flex flex-col items-center">
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
              <p className="text-black font-medium">Uploading...</p>
            </>
          ) : (
            <>
              <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-black font-medium mb-2">
                Drag & drop images here
              </p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Browse Files
              </button>
              <p className="text-xs text-gray-500 mt-4">
                PNG, JPG, GIF up to 5MB each (multiple files supported)
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mt-3">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Upload multiple images to create a carousel. 
          Drag images to reorder them. The first image will be the main display.
        </p>
      </div>
    </div>
  )
}
