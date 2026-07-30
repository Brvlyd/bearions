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
    // dvh (not vh) so the hero matches the space actually visible once mobile
    // browser chrome is accounted for; min-h lets it grow rather than clip if
    // the copy ever outgrows one screen.
    <div className="min-h-dvh bg-white relative">
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

      {/* CTA Overlay — the button is the only content on the hero, so it gets a
          bobs on a loop and sits on a halo so it reads over any photo behind it. */}
      {/* min-h (not h-full) because the parent no longer has a fixed height.
          items-end + pb parks the button in the lower third; pt-20 still keeps
          it clear of the fixed 4rem header on short viewports. */}
      <div className="relative z-10 min-h-dvh flex items-end justify-center pt-20 pb-24 md:pb-32 lg:pb-40 px-4">
        <div className="hero-cta-bob group relative">
          {/* Soft dark halo: guarantees contrast on light photos. */}
          <div className="hero-cta-halo pointer-events-none absolute -inset-8 rounded-4xl bg-white blur-2xl transition-colors duration-300 group-hover:bg-black/60" />

          {/* Matte sticker look: flat pastel fill, no sheen, and a solid offset
              shadow the button sinks into when pressed. */}
          <Link
            href="/catalog"
            className="relative inline-flex items-center gap-3 rounded-2xl bg-gray-100 px-10 py-5 lg:px-14 lg:py-6 text-xl lg:text-3xl font-extrabold text-black shadow-[0_7px_0_0_#000000] transition-all duration-200 ease-out will-change-transform hover:-translate-y-1 hover:rotate-2 hover:scale-105 hover:bg-gray-300 hover:shadow-[0_10px_0_0_#000000] active:translate-y-1.5 active:rotate-0 active:scale-100 active:shadow-[0_1px_0_0_#000000] active:duration-75 focus-visible:outline-hidden"
          >
            <span aria-hidden="true" className="hero-cta-mascot inline-block">
            </span>
            {t('home.hero.cta')}
          </Link>
        </div>
      </div>
    </div>
  );
}
