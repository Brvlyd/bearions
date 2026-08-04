'use client'

import { useEffect, useState } from 'react'
import Link from "next/link";
import { useLanguage } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { splitHeroImagesByDevice, type HeroImageRow } from '@/lib/hero-images'
import HeroBackground from '@/components/HeroBackground'
import WelcomeIntroModal from '@/components/WelcomeIntroModal'

export default function Home() {
  const { t, tr } = useLanguage()
  const [images, setImages] = useState<HeroImageRow[]>([])

  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_page_images')
        .select('*')

      if (error) throw error
      setImages(data || [])
    } catch (error) {
      console.error('Error loading landing page images:', error)
    }
  }

  const { desktop: desktopImages, mobile: mobileImages } = splitHeroImagesByDevice(images)

  return (
    // dvh (not vh) so the hero matches the space actually visible once mobile
    // browser chrome is accounted for; min-h lets it grow rather than clip if
    // the copy ever outgrows one screen.
    <div className="min-h-dvh bg-white relative">
      <WelcomeIntroModal />
      <HeroBackground
        desktopImages={desktopImages}
        mobileImages={mobileImages}
        alt={tr('Landing page background', 'Latar belakang landing page')}
      />

      {/* CTA Overlay — the button is the only content on the hero, so it gets a
          bobs on a loop and sits on a halo so it reads over any photo behind it. */}
      {/* min-h (not h-full) because the parent no longer has a fixed height.
          items-end + pb parks the button in the lower third; pt-20 still keeps
          it clear of the fixed 4rem header on short viewports. */}
      <div className="relative z-10 min-h-dvh flex items-end justify-center pt-20 pb-24 md:pb-32 lg:pb-40 px-4">
        <div className="hero-cta-bob group relative">
          {/* Soft white glow at rest, kept tight; swaps to a slightly larger
              dark halo on hover for contrast against light photos. */}
          <div className="hero-cta-halo pointer-events-none absolute -inset-4 rounded-4xl bg-gray-700 blur-lg transition-all duration-300 group-hover:-inset-3 group-hover:bg-black group-hover:blur-md" />

          {/* Matte sticker look: flat black fill, no sheen, and a solid offset
              shadow the button sinks into when pressed. */}
          <Link
            href="/catalog"
            className="relative inline-flex items-center gap-3 rounded-2xl border-2 border-black bg-black px-7 py-3.5 lg:px-9 lg:py-4 text-base lg:text-xl font-extrabold text-white shadow-[0_5px_0_0_#3f3f46] transition-all duration-200 ease-out will-change-transform hover:-translate-y-1 hover:rotate-2 hover:scale-105 hover:bg-gray-900 hover:shadow-[0_7px_0_0_#3f3f46] active:translate-y-1.5 active:rotate-0 active:scale-100 active:shadow-[0_1px_0_0_#3f3f46] active:duration-75 focus-visible:outline-hidden"
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
