'use client'

import { useEffect, useRef } from 'react'
import { useLanguage } from '@/lib/i18n'

const VIDEO_SRC = '/images/bearion_popup.mp4'

/** The clip's final frame. Doubles as the still for anyone who never sees it move. */
const POSTER_SRC = '/images/bearion_popup_poster.jpg'

interface BearionIntroAnimationProps {
  className?: string
  /** Decoration alongside other content stays out of the accessibility tree. */
  decorative?: boolean
}

/**
 * The Bearion logo reveal. Plays once and rests on the finished logo — it spells
 * the brand out letter by letter, so looping it would just retype forever.
 */
export default function BearionIntroAnimation({
  className = '',
  decorative = false,
}: BearionIntroAnimationProps) {
  const { tr } = useLanguage()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Playback is driven here rather than by the autoPlay attribute so that
    // reduced-motion visitors simply keep the poster, and so a browser that
    // refuses to autoplay degrades to the same still instead of a blank box.
    const video = videoRef.current
    if (!video) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Muted must be set as a property; some browsers only grant autoplay when
    // it is already true at the moment play() is called.
    video.muted = true
    video.play().catch(() => {})
  }, [])

  return (
    <video
      ref={videoRef}
      className={className}
      poster={POSTER_SRC}
      preload="auto"
      playsInline
      muted
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : tr('Bearion logo animation', 'Animasi logo Bearion')}
    >
      <source src={VIDEO_SRC} type="video/mp4" />
    </video>
  )
}
