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

      if (error) throw error
      setImages(data || [])
    } catch (error) {
      console.error('Error loading landing page images:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="h-screen bg-white overflow-hidden relative fixed inset-0">
      {/* Three Image Grid Background */}
      <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-3 gap-0">
        {[1, 2, 3].map((position) => {
          const image = images.find(img => img.position === position)
          const gradients = [
            'from-gray-100 to-gray-200',
            'from-gray-200 to-gray-300',
            'from-gray-300 to-gray-400'
          ]
          const emojis = ['🐻', '✨', '🎁']
          
          return (
            <div key={position} className={`relative overflow-hidden bg-gradient-to-br ${gradients[position - 1]}`}>
              {image?.image_url ? (
                <img
                  src={getImageUrl(image.image_url)}
                  alt={`Landing page background ${position}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-8xl">{emojis[position - 1]}</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Welcome Section Overlay */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="text-center px-4 sm:px-6 lg:px-8 bg-white/10 rounded-3xl p-8 md:p-12 lg:p-16 max-w-3xl mx-4">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-4 lg:mb-6 text-white drop-shadow-lg">
            {t('home.hero.title')}
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl mb-6 lg:mb-8 text-white drop-shadow-md">
            {t('home.hero.subtitle')}
          </p>
          <Link
            href="/catalog"
            className="inline-block bg-black/90 text-white px-6 py-3 lg:px-8 lg:py-4 rounded-lg font-semibold hover:bg-black transition text-base lg:text-lg shadow-md hover:shadow-lg"
          >
            {t('home.hero.cta')}
          </Link>
        </div>
      </div>
    </div>
  );
}
