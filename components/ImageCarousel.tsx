'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SafeImage from './SafeImage'
import { useLanguage } from '@/lib/i18n'

interface ImageCarouselProps {
  images: string[]
  alt: string
  autoPlay?: boolean
  interval?: number
  category?: string
}

/** Gap between a control and the edge of the photo it sits on. */
const CONTROL_INSET = 12

type Size = { width: number; height: number }

/**
 * Product photos are shown uncropped (object-contain), so on a portrait or
 * landscape shot the square frame keeps letterbox bars the photo does not
 * cover. Controls pinned to the frame would float in that empty margin, which
 * is what made the old arrows look detached from the image.
 *
 * Measuring the frame and the bitmap lets the controls sit on the photo itself
 * whatever shape it is.
 */
function useRenderedImageInset(
  frame: Size,
  natural: Size | null
): { x: number; y: number } {
  return useMemo(() => {
    if (!natural || !frame.width || !frame.height || !natural.width || !natural.height) {
      return { x: 0, y: 0 }
    }

    const scale = Math.min(frame.width / natural.width, frame.height / natural.height)

    return {
      x: Math.max(0, (frame.width - natural.width * scale) / 2),
      y: Math.max(0, (frame.height - natural.height * scale) / 2),
    }
  }, [frame.width, frame.height, natural])
}

export default function ImageCarousel({ images, alt, autoPlay = true, interval = 3000, category }: ImageCarouselProps) {
  const { tr } = useLanguage()
  const [requestedIndex, setRequestedIndex] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState<Size>({ width: 0, height: 0 })
  // Keyed by URL, not position: a shorter or reordered image list then reuses
  // what was already measured instead of needing a reset, and stepping back to
  // an already-seen photo does not make the controls jump.
  const [naturalSizes, setNaturalSizes] = useState<Record<string, Size>>({})

  // Wrapping here rather than in the setters means a list that shrinks under
  // us (different product, colour variant) can never point past its end.
  const currentIndex = images.length > 0 ? requestedIndex % images.length : 0
  const currentImageUrl = images[currentIndex]

  useEffect(() => {
    if (!autoPlay || images.length <= 1) return

    const timer = setInterval(() => {
      setRequestedIndex((prev) => (prev + 1) % images.length)
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, images.length, interval])

  useEffect(() => {
    const node = frameRef.current
    if (!node) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setFrame({ width, height })
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const handleImageLoad = useCallback(
    (url: string) => (image: HTMLImageElement) => {
      if (!image.naturalWidth || !image.naturalHeight) return
      setNaturalSizes((prev) =>
        prev[url]?.width === image.naturalWidth ? prev : {
          ...prev,
          [url]: { width: image.naturalWidth, height: image.naturalHeight },
        }
      )
    },
    []
  )

  const inset = useRenderedImageInset(frame, naturalSizes[currentImageUrl] ?? null)

  const goToPrevious = () => {
    setRequestedIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setRequestedIndex((prev) => (prev + 1) % images.length)
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
          objectFit="contain"
        />
      </div>
    )
  }

  // Rest state is the bare chevron with no plate behind it, so the control
  // covers as little of the photo as possible. Kept visible at all times on
  // touch, where there is no hover to reveal it with.
  const navButton =
    'group/nav absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full ' +
    'text-black transition-[opacity,transform] duration-200 active:scale-90 ' +
    'focus-visible:outline-hidden ' +
    'md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100'

  // Its own layer rather than the button's own background: that way the disc
  // can grow into place while the chevron does its nudge, and the press
  // shrink applies to both without fighting the button's -translate-y.
  const navPlate =
    'absolute inset-0 rounded-full bg-white/80 shadow-lg shadow-black/10 ring-1 ring-black/5 backdrop-blur-md ' +
    'scale-50 opacity-0 transition-all duration-200 ease-out ' +
    'group-hover/nav:scale-100 group-hover/nav:opacity-100 ' +
    'group-focus-visible/nav:scale-100 group-focus-visible/nav:opacity-100 ' +
    'group-focus-visible/nav:ring-2 group-focus-visible/nav:ring-black ' +
    'group-active/nav:bg-white'

  // The white halo is what keeps a bare black chevron legible on a dark photo;
  // once the plate is behind it the halo is no longer doing any work.
  const navIcon =
    'relative w-5 h-5 transition-[transform,filter] duration-200 ' +
    'drop-shadow-[0_0_3px_rgba(255,255,255,0.9)] group-hover/nav:drop-shadow-none'

  return (
    <div className="relative w-full h-full group bg-white">
      {/* Main Image */}
      <div ref={frameRef} className="relative w-full h-full overflow-hidden p-4">
        <div className="relative w-full h-full">
          <SafeImage
            key={`carousel-image-${currentIndex}`}
            src={currentImageUrl}
            alt={`${alt} - Image ${currentIndex + 1}`}
            fill
            category={category}
            className="transition-opacity duration-500 ease-in-out"
            objectFit="contain"
            onLoad={handleImageLoad(currentImageUrl)}
            priority
          />
        </div>
      </div>

      {/* Navigation Buttons — offset by the letterbox margin so they always
          land on the photo, never on the blank frame beside it. */}
      <button
        onClick={goToPrevious}
        style={{ left: inset.x + CONTROL_INSET }}
        className={navButton}
        aria-label={tr('Previous image', 'Gambar sebelumnya')}
        type="button"
      >
        <span aria-hidden className={navPlate} />
        <ChevronLeft className={`${navIcon} group-hover/nav:-translate-x-0.5`} />
      </button>

      <button
        onClick={goToNext}
        style={{ right: inset.x + CONTROL_INSET }}
        className={navButton}
        aria-label={tr('Next image', 'Gambar berikutnya')}
        type="button"
      >
        <span aria-hidden className={navPlate} />
        <ChevronRight className={`${navIcon} group-hover/nav:translate-x-0.5`} />
      </button>

      {/* Dots Indicator */}
      <div
        style={{ bottom: inset.y + CONTROL_INSET }}
        className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur-md"
      >
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setRequestedIndex(index)}
            type="button"
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90'
            }`}
            aria-label={`${tr('Go to image', 'Ke gambar')} ${index + 1}`}
          />
        ))}
      </div>

      {/* Image Counter */}
      <div
        style={{ top: inset.y + CONTROL_INSET, right: inset.x + CONTROL_INSET }}
        className="absolute z-10 rounded-full bg-black/35 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md tabular-nums"
      >
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  )
}
