'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Sparkles } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

const SEEN_KEY = 'bearion_welcome_seen'
const SHOW_DELAY_MS = 500

export default function WelcomeIntroModal() {
  const { tr } = useLanguage()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Read after mount, not during render — the server can't know what this
    // browser has already seen, so deciding during render would desync the
    // client markup from the server markup and break hydration.
    if (localStorage.getItem(SEEN_KEY)) return

    const timer = window.setTimeout(() => {
      setMounted(true)
      requestAnimationFrame(() => setOpen(true))
    }, SHOW_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [])

  const close = () => {
    setOpen(false)
    localStorage.setItem(SEEN_KEY, '1')
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
        className="fixed inset-0 flex items-center justify-center z-[101] p-4"
        onClick={close}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={tr('Welcome to Bearion', 'Selamat Datang di Bearion')}
          onClick={(e) => e.stopPropagation()}
          className={`relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all duration-300 ${
            open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          <button
            type="button"
            onClick={close}
            aria-label={tr('Close', 'Tutup')}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="bg-black px-8 pt-10 pb-8 text-center">
            <div className="w-16 h-16 bg-white text-black flex items-center justify-center font-bold text-2xl rounded-xl mx-auto mb-4">
              B
            </div>
            <h2 className="text-white text-2xl font-extrabold tracking-tight">
              {tr('Welcome to Bearion', 'Selamat Datang di Bearion')}
            </h2>
          </div>

          <div className="px-8 py-6 text-center">
            <p className="text-gray-600 leading-relaxed mb-6">
              {tr(
                'Modern fashion for your everyday style. New arrivals, honest prices, and a catalog worth exploring — let’s get you started.',
                'Fashion modern untuk gaya harian kamu. Koleksi terbaru, harga jujur, dan katalog yang layak dijelajahi — yuk mulai lihat-lihat.'
              )}
            </p>

            <Link
              href="/catalog"
              onClick={close}
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-black px-6 py-3.5 font-semibold text-white transition-all duration-200 hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              {tr('Start Shopping', 'Mulai Belanja')}
            </Link>

            <button
              type="button"
              onClick={close}
              className="mt-3 text-sm text-gray-500 hover:text-black transition-colors"
            >
              {tr('Just browsing', 'Lihat-lihat dulu')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
