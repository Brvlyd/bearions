'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import { AboutUsContent } from '@/lib/supabase'
import { DEFAULT_ABOUT_US_CONTENT, loadAboutUsContent } from '@/lib/about-us'

export default function AboutPage() {
  const { tr } = useLanguage()
  const [content, setContent] = useState<AboutUsContent>(DEFAULT_ABOUT_US_CONTENT)
  const [loading, setLoading] = useState(true)
  const [schemaMissing, setSchemaMissing] = useState(false)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const result = await loadAboutUsContent()
      setContent(result.data)
      setSchemaMissing(result.tableMissing)
      setLoading(false)
    }

    run()
  }, [])

  return (
    <div className="relative min-h-screen pt-16 overflow-hidden">
      <div className="absolute inset-0">
        {content.background_image_url ? (
          <img
            src={content.background_image_url}
            alt={tr('About Us Background', 'Latar Belakang Tentang Kami')}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-zinc-900 via-gray-700 to-zinc-800" />
        )}
      </div>

      <div className="absolute inset-0 bg-black/55" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
        <div className="w-full max-w-3xl bg-white/92 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl px-6 py-10 sm:px-10 sm:py-12 text-center">
          {schemaMissing && (
            <p className="mb-5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              {tr(
                'About Us table is not ready yet. Run about-us-schema.sql in Supabase SQL Editor.',
                'Tabel About Us belum siap. Jalankan about-us-schema.sql di Supabase SQL Editor.'
              )}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black" />
            </div>
          ) : (
            <>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-black">{content.title}</h1>
              <p className="mt-5 text-lg sm:text-xl text-gray-800 leading-relaxed">{content.headline}</p>

              <div className="mt-6 space-y-4">
                {(content.content_blocks || []).map((block) => {
                  if (block.type === 'image' && block.image_url) {
                    return (
                      <img
                        key={block.id}
                        src={block.image_url}
                        alt={tr('About content image', 'Gambar konten tentang kami')}
                        className="w-full rounded-xl border border-gray-200"
                      />
                    )
                  }

                  if (block.type === 'text' && block.text) {
                    return (
                      <p
                        key={block.id}
                        className="text-base sm:text-lg text-gray-700 leading-relaxed whitespace-pre-line"
                      >
                        {block.text}
                      </p>
                    )
                  }

                  return null
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
