'use client'

import Image from 'next/image'
import { useState } from 'react'
import { getImageUrl, getCategoryPlaceholder } from '@/lib/image-utils'

interface SafeImageProps {
  src: string | null | undefined
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  priority?: boolean
  category?: string
  sizes?: string
}

/**
 * SafeImage Component
 * Handles image loading errors gracefully with fallback to placeholder
 */
export default function SafeImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className = '',
  priority = false,
  category,
  sizes,
}: SafeImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(getImageUrl(src))
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError) {
      setHasError(true)
      // Use category-specific placeholder if available
      const fallback = category 
        ? getCategoryPlaceholder(category)
        : getImageUrl(null)
      setImageSrc(fallback)
    }
  }

  const imageProps = {
    src: imageSrc,
    alt: alt || 'Product image',
    className: `${className} ${hasError ? 'opacity-75' : ''}`,
    onError: handleError,
    priority,
    sizes: sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  }

  if (fill) {
    return (
      <Image
        {...imageProps}
        fill
        style={{ objectFit: 'cover' }}
      />
    )
  }

  if (width && height) {
    return (
      <Image
        {...imageProps}
        width={width}
        height={height}
        style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
      />
    )
  }

  // Fallback to fill if no dimensions provided
  return (
    <Image
      {...imageProps}
      fill
      style={{ objectFit: 'cover' }}
    />
  )
}
