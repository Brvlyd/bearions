'use client'

import Image from 'next/image'

interface LoadingSpinnerProps {
  /** Text shown below the spinner. */
  label?: string
  /** Centers the spinner in the full viewport height instead of its own container. */
  fullScreen?: boolean
  /** 'light' swaps in the white mark + white ring for dark backgrounds. */
  variant?: 'dark' | 'light'
  /** Adds the default vertical breathing room. Turn off inside containers that already provide their own (a modal box, an overlay). */
  padded?: boolean
  className?: string
}

const LOGO_SRC: Record<'dark' | 'light', string> = {
  dark: '/images/bearion-logo2.png',
  light: '/images/bearion-logo2-light.png',
}

// Shared "big ring + breathing logo" loader so every wait in the app reads as
// the same brand moment instead of a bare spinner. `variant` picks the mark
// colour for the surface it sits on — it does not follow the site theme.
export default function LoadingSpinner({
  label,
  fullScreen = false,
  variant = 'dark',
  padded = true,
  className = '',
}: LoadingSpinnerProps) {
  const ringClass = variant === 'dark' ? 'border-black' : 'border-white'
  const labelClass = variant === 'dark' ? 'text-gray-600' : 'text-white/80'

  return (
    <div
      className={`flex flex-col items-center justify-center gap-5 ${
        fullScreen ? 'min-h-screen' : padded ? 'py-16' : ''
      } ${className}`}
    >
      <div className="relative h-24 w-24 shrink-0">
        <div className={`absolute inset-0 rounded-full border-[6px] border-b-transparent animate-spin ${ringClass}`} />
        <div className="absolute inset-3 flex items-center justify-center animate-pulse">
          <Image
            src={LOGO_SRC[variant]}
            alt=""
            fill
            sizes="72px"
            className="object-contain"
            priority={fullScreen}
          />
        </div>
      </div>
      {label && <p className={`text-sm font-medium ${labelClass}`}>{label}</p>}
    </div>
  )
}
