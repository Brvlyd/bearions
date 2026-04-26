'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SafeImage from './SafeImage'
import { getImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/lib/i18n'

interface ImageCarouselProps {
  images: string[]
  alt: string
  autoPlay?: boolean
  interval?: number
  category?: string
}

export default function ImageCarousel({ images, alt, autoPlay = true, interval = 3000, category }: ImageCarouselProps) {
  const { tr } = useLanguage()
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!autoPlay || images.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, images.length, interval])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  if (images.length === 0) {
    return (
      <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
        <p className="text-gray-400">{tr('No image available', 'Gambar tidak tersedia')}</p>
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <div className="relative w-full h-full bg-white flex items-center justify-center p-4">
        <SafeImage
          src={images[0]}
          alt={alt}
          fill
          category={category}
          className="object-contain"
        />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full group bg-white">
      {/* Main Image */}
      <div className="relative w-full h-full overflow-hidden flex items-center justify-center p-4">
        <div className="relative w-full h-full">
          <SafeImage
            src={images[currentIndex]}
            alt={`${alt} - Image ${currentIndex + 1}`}
            fill
            category={category}
            className="object-contain transition-all duration-700 ease-in-out"
            priority
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={goToPrevious}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition opacity-0 group-hover:opacity-100"
        aria-label={tr('Previous image', 'Gambar sebelumnya')}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition opacity-0 group-hover:opacity-100"
        aria-label={tr('Next image', 'Gambar berikutnya')}
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition ${
              index === currentIndex
                ? 'bg-white w-6'
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`${tr('Go to image', 'Ke gambar')} ${index + 1}`}
          />
        ))}
      </div>

      {/* Image Counter */}
      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  )
}
