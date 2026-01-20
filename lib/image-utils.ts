/**
 * Image Utility Functions for Bearions E-commerce
 * Handles image URLs, placeholders, and Supabase storage
 */

import { supabase } from './supabase'

// Placeholder image URL (using a reliable CDN)
export const PLACEHOLDER_IMAGE = 'https://placehold.co/600x600/e5e7eb/1f2937?text=Bearions+Product'

/**
 * Get optimized image URL from Supabase or fallback to placeholder
 */
export function getImageUrl(url: string | null | undefined): string {
  if (!url) {
    return PLACEHOLDER_IMAGE
  }

  // If it's already a full URL (https://), return it
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url
  }

  // If it's a local path that doesn't exist, return placeholder
  if (url.startsWith('/images/') || url.startsWith('/public/')) {
    console.warn(`Local image path detected: ${url}. Using placeholder instead.`)
    return PLACEHOLDER_IMAGE
  }

  // If it's a Supabase storage path
  if (url.startsWith('product-images/')) {
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(url)
    
    return data.publicUrl || PLACEHOLDER_IMAGE
  }

  // Default to placeholder
  return PLACEHOLDER_IMAGE
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadProductImage(
  file: File,
  productId: string
): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${productId}-${Date.now()}.${fileExt}`
    const filePath = `product-images/${fileName}`

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading image:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error in uploadProductImage:', error)
    return null
  }
}

/**
 * Upload multiple images to Supabase Storage
 */
export async function uploadMultipleProductImages(
  files: File[],
  productId: string
): Promise<string[]> {
  const uploadPromises = files.map(file => uploadProductImage(file, productId))
  const results = await Promise.all(uploadPromises)
  return results.filter((url): url is string => url !== null)
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract path from URL
    const urlParts = imageUrl.split('/storage/v1/object/public/product-images/')
    if (urlParts.length < 2) {
      return false
    }

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('product-images')
      .remove([`product-images/${filePath}`])

    if (error) {
      console.error('Error deleting image:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteProductImage:', error)
    return false
  }
}

/**
 * Generate placeholder for product based on category
 */
export function getCategoryPlaceholder(category: string): string {
  const placeholders: Record<string, string> = {
    'Tops': 'https://placehold.co/600x600/e5e7eb/1f2937?text=T-Shirt',
    'Bottoms': 'https://placehold.co/600x600/e5e7eb/1f2937?text=Pants',
    'Accessories': 'https://placehold.co/600x600/e5e7eb/1f2937?text=Accessories',
    'Outerwear': 'https://placehold.co/600x600/e5e7eb/1f2937?text=Jacket',
  }

  return placeholders[category] || PLACEHOLDER_IMAGE
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' }
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' }
  }

  return { valid: true }
}

/**
 * Compress image before upload (client-side)
 */
export async function compressImage(file: File, maxWidth: number = 1200): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          'image/jpeg',
          0.85
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
  })
}
