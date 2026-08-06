'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Sparkles } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { authService } from '@/lib/auth'
import { consumeWelcomeAfterLogin, hasSeenWelcome, markWelcomeSeen } from '@/lib/welcome-intro'
import BearionIntroAnimation from './BearionIntroAnimation'

const SHOW_DELAY_MS = 500

export default function WelcomeIntroModal() {
  const { tr } = useLanguage()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Read after mount, not during render — the server can't know what this
    // browser has already seen, so deciding during render would desync the
    // client markup from the server markup and break hydration.
    //
    // A customer who just signed in gets the greeting every time; "already
    // seen" only suppresses the unprompted first-visit one.
    const justLoggedIn = consumeWelcomeAfterLogin()
    if (!justLoggedIn && hasSeenWelcome()) return

    let cancelled = false
    let timer = 0

    const show = () => {
      timer = window.setTimeout(() => {
        setMounted(true)
        requestAnimationFrame(() => setOpen(true))
      }, SHOW_DELAY_MS)
    }

    // Only the customer branch of the login form sets that flag, so there is
    // nobody left to screen out — skipping the round trip lets the animation
    // start right as the landing page appears.
    if (justLoggedIn) {
      show()
      return () => window.clearTimeout(timer)
    }

    const run = async () => {
      // A "Start Shopping" pitch is for customers. An admin landing on the
      // storefront is on their way to the dashboard, so they never see it.
      if (await authService.isAdmin()) return
      if (cancelled) return

      show()
    }

    run()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  const close = () => {
    setOpen(false)
    markWelcomeSeen()
    setTimeout(() => setMounted(false), 300)
  }

  useEffect(() => {
    if (!mounted) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mounted])

  if (!mounted) return null

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={close}
      />

      <div
        className="fixed inset-0 flex items-center justify-center z-[101] p-3 sm:p-6"
        onClick={close}
      >
        {/* The clip is the point of this dialog, so the panel is sized to it and
            everything else is kept to a single line beneath — black throughout,
            because the clip's own edges are black and any seam would show. */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={tr('Welcome to Bearion', 'Selamat Datang di Bearion')}
          onClick={(e) => e.stopPropagation()}
          className={`relative bg-black rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-2xl lg:max-w-3xl overflow-hidden transform transition-all duration-300 ${
            open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          <button
            type="button"
            onClick={close}
            aria-label={tr('Close', 'Tutup')}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 ring-1 ring-white/25 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <X className="w-4 h-4" />
          </button>

          {/* object-contain, not cover: the height cap keeps the panel on screen
              in landscape and on short windows, and cropping there would cut
              into the logo. Any letterboxing it leaves is invisible on black. */}
          <BearionIntroAnimation className="block w-full aspect-video max-h-[60dvh] object-contain" />

          <div className="flex flex-col items-center gap-3 px-5 py-4 sm:flex-row sm:justify-between sm:gap-6 sm:px-7 sm:py-5">
            <h2 className="text-white text-base sm:text-lg lg:text-xl font-extrabold tracking-tight text-center sm:text-left">
              {tr('Welcome to Bearion', 'Selamat Datang di Bearion')}
            </h2>

            <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:shrink-0 sm:flex-row-reverse sm:gap-4">
              <Link
                href="/catalog"
                onClick={close}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-black transition-all duration-200 hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
              >
                <Sparkles className="w-4 h-4" />
                {tr('Start Shopping', 'Mulai Belanja')}
              </Link>

              <button
                type="button"
                onClick={close}
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                {tr('Just browsing', 'Lihat-lihat dulu')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
