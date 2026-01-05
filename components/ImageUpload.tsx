'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageChange: (url: string) => void
  productId?: string
}

export default function ImageUpload({ currentImageUrl, onImageChange, productId }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl || '')
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

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)
      setError('')

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
      const { error: uploadError, data } = await supabase.storage
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

      setPreviewUrl(publicUrl)
      onImageChange(publicUrl)
      
    } catch (error: any) {
      console.error('Upload error:', error)
      setError(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0])
    }
  }

  const handleRemove = async () => {
    if (previewUrl && previewUrl.includes('supabase')) {
      try {
        // Extract file path from URL
        const urlParts = previewUrl.split('/product-images/')
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
    
    setPreviewUrl('')
    onImageChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-black">
        Product Image
      </label>

      {previewUrl ? (
        <div className="space-y-3">
          <div className="relative w-auto h-96 border-2 border-gray-300 rounded-lg bg-gray-50 px-10 py-4">
            <div className="relative w-full h-full">
              <Image
                src={previewUrl}
                alt="Product preview"
                fill
                className="object-contain"
                onError={() => {
                  setError('Failed to load image')
                  setPreviewUrl('')
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-lg"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Click the <strong>X</strong> button to remove and upload a new image
          </p>
        </div>
      ) : (
        <div
          className={`relative border-2 border-dashed rounded-lg p-12 text-center transition ${
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
          />
          
          <div className="flex flex-col items-center">
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
                <p className="text-black font-medium">Uploading...</p>
              </>
            ) : (
              <>
                <ImageIcon className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-black font-medium mb-2">
                  Drag & drop an image here
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
                  PNG, JPG, GIF up to 5MB
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mt-3">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Images are automatically stored in Supabase Storage. 
          For best results, use square images (1:1 ratio) at least 800x800px.
        </p>
      </div>
    </div>
  )
}
