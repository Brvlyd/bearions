'use client'

import { useEffect, useState } from 'react'
import Link from "next/link";
import { useLanguage } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { getImageUrl } from '@/lib/image-utils'

interface LandingPageImage {
  id: string
  position: number
  image_url: string
}

const MAX_LANDING_IMAGES = 6

const getGridColumnsClass = (count: number) => {
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-1 md:grid-cols-2'
  if (count === 3) return 'grid-cols-1 md:grid-cols-3'
  if (count === 4) return 'grid-cols-1 sm:grid-cols-2'
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
}

export default function Home() {
  const { t } = useLanguage()
  const [images, setImages] = useState<LandingPageImage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadImages()
    
    // Disable scrolling on mount
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    // Re-enable scrolling on unmount
    return () => {
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
    }
  }, [])

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_page_images')
        .select('*')
        .order('position', { ascending: true })
        .limit(MAX_LANDING_IMAGES)

      if (error) throw error
      setImages(data || [])
    } catch (error) {
      console.error('Error loading landing page images:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const backgroundImages = images
    .filter((img) => !!img.image_url)
    .sort((a, b) => a.position - b.position)
    .slice(0, MAX_LANDING_IMAGES)

  const displayedCount = Math.max(backgroundImages.length, 1)
  const gridClass = getGridColumnsClass(displayedCount)
  const fallbackEmojis = ['🐻', '✨', '🎁', '🧸', '🛍️', '🌟']
  const fallbackGradients = [
    'from-gray-100 to-gray-200',
    'from-gray-200 to-gray-300',
    'from-gray-300 to-gray-400',
    'from-slate-200 to-slate-300',
    'from-zinc-200 to-zinc-300',
    'from-stone-200 to-stone-300'
  ]

  return (
    <div className="h-screen bg-white overflow-hidden relative inset-0">
      {/* Dynamic Image Grid Background */}
      <div className={`absolute inset-0 grid ${gridClass} auto-rows-fr gap-0`}>
        {(backgroundImages.length > 0 ? backgroundImages : [null]).map((image, index) => {
          const gradient = fallbackGradients[index % fallbackGradients.length]
          const emoji = fallbackEmojis[index % fallbackEmojis.length]

          return (
            <div
              key={image?.id || `fallback-${index}`}
              className={`relative overflow-hidden bg-linear-to-br ${gradient}`}
            >
              {image?.image_url ? (
                <img
                  src={getImageUrl(image.image_url)}
                  alt={`Landing page background ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-8xl">{emoji}</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Welcome Section Overlay */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="text-center px-4 sm:px-6 lg:px-8 bg-black/75 rounded-3xl p-8 md:p-12 lg:p-16 max-w-3xl mx-4">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-4 lg:mb-6 text-white drop-shadow-lg">
            {t('home.hero.title')}
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl mb-6 lg:mb-8 text-white drop-shadow-md">
            {t('home.hero.subtitle')}
          </p>
          <Link
            href="/catalog"
            className="inline-block bg-black/90 text-white px-6 py-3 lg:px-8 lg:py-4 rounded-lg font-semibold text-base lg:text-lg shadow-md transition-all duration-300 ease-out will-change-transform hover:bg-black hover:-translate-y-1 hover:scale-105 hover:shadow-2xl active:translate-y-0 active:scale-95 active:shadow-md"
          >
            {t('home.hero.cta')}
          </Link>
        </div>
      </div>
    </div>
  );
}
