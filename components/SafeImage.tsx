'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
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

  // Update imageSrc when src prop changes
  useEffect(() => {
    const nextSrc = getImageUrl(src)
    setImageSrc(nextSrc)
    setHasError(false)
  }, [src])

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
    unoptimized: true,
    priority,
    sizes: sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  }

  if (fill) {
    // `fill` positions the image absolutely, so it needs its own relatively
    // positioned box here rather than trusting every call site to remember
    // one — otherwise the image escapes to the nearest positioned ancestor
    // and can balloon far past the intended container.
    return (
      <div className="relative w-full h-full">
        <Image
          {...imageProps}
          fill
          style={{ objectFit: 'cover' }}
        />
      </div>
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
    <div className="relative w-full h-full">
      <Image
        {...imageProps}
        fill
        style={{ objectFit: 'cover' }}
      />
    </div>
  )
}
