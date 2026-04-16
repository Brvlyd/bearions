'use client'

import { useState, useEffect } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { CommunityPost, supabase } from '@/lib/supabase'
import { getImageUrl } from '@/lib/image-utils'
import {
  getCommunityTileClassName,
  normalizeCommunityLayoutSize,
} from '@/lib/community-layout'

type SupabaseErrorLike = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

const parseErrorInfo = (error: unknown, unknownErrorText = 'Unknown error') => {
  const err = (error || {}) as SupabaseErrorLike
  const message = err.message || unknownErrorText
  const details = err.details || ''
  const hint = err.hint || ''
  const code = err.code || 'UNKNOWN'
  const combined = `${message} ${details} ${hint}`.toLowerCase()

  const isMissingTableError =
    code === '42P01' ||
    code === 'PGRST205' ||
    (combined.includes('community_posts') &&
      (combined.includes('does not exist') ||
        combined.includes('schema cache') ||
        combined.includes('could not find the table')))

  const isMissingLayoutColumnError =
    (combined.includes('layout_order') || combined.includes('layout_size')) &&
    (combined.includes('does not exist') || combined.includes('schema cache'))

  return {
    message,
    details,
    hint,
    code,
    isMissingTableError,
    isMissingLayoutColumnError,
  }
}

export default function CommunityPage() {
  const { language } = useLanguage()
  const unknownErrorText = language === 'en' ? 'Unknown error' : 'Error tidak diketahui'
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePost, setActivePost] = useState<CommunityPost | null>(null)
  const [modalReady, setModalReady] = useState(false)

  useEffect(() => {
    loadPosts()
  }, [])

  useEffect(() => {
    if (!activePost) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = 'auto'
      window.removeEventListener('keydown', handleEscape)
    }
  }, [activePost])

  useEffect(() => {
    if (!activePost) {
      setModalReady(false)
      return
    }

    setModalReady(false)
    const frame = window.requestAnimationFrame(() => {
      setModalReady(true)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [activePost])

  const closeModal = () => {
    setModalReady(false)
    window.setTimeout(() => {
      setActivePost(null)
    }, 180)
  }

  const loadPosts = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('layout_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) {
        const parsed = parseErrorInfo(error, unknownErrorText)

        if (parsed.isMissingTableError) {
          setSchemaMissing(true)
          setPosts([])
          return
        }

        if (parsed.isMissingLayoutColumnError) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('community_posts')
            .select('*')
            .order('created_at', { ascending: false })

          if (!fallbackError) {
            const normalizedPosts = ((fallbackData || []) as CommunityPost[]).map((post, index) => ({
              ...post,
              layout_size: normalizeCommunityLayoutSize(post.layout_size),
              layout_order: post.layout_order ?? index + 1,
            }))

            setSchemaMissing(false)
            setLoadError(
              language === 'en'
                ? 'Tetris layout columns are missing. Run add-community-layout-columns.sql for full control.'
                : 'Kolom layout tetris belum ada. Jalankan add-community-layout-columns.sql untuk kontrol penuh.'
            )
            setPosts(normalizedPosts)
            return
          }
        }

        setSchemaMissing(false)
        setLoadError(`${parsed.message} (${parsed.code})`)
        console.error('Error loading community gallery:', parsed)
        return
      }

      const normalizedPosts = ((data || []) as CommunityPost[]).map((post, index) => ({
        ...post,
        layout_size: normalizeCommunityLayoutSize(post.layout_size),
        layout_order: post.layout_order ?? index + 1,
      }))

      setSchemaMissing(false)
      setPosts(normalizedPosts)
    } catch (error) {
      const parsed = parseErrorInfo(error, unknownErrorText)
      setSchemaMissing(false)
      setLoadError(`${parsed.message} (${parsed.code})`)
      console.error('Error loading community gallery:', parsed)
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2 text-black text-center">
            {language === 'en' ? 'Community Gallery' : 'Galeri Komunitas'}
          </h1>
          <p className="text-sm text-gray-600 text-center">
            {language === 'en'
              ? 'A simple visual gallery of admin posts.'
              : 'Galeri visual sederhana dari post admin.'}
          </p>
        </div>

        {schemaMissing && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {language === 'en'
              ? 'Community gallery is not set up yet. Please run community-posts-schema.sql in Supabase SQL Editor.'
              : 'Galeri komunitas belum disiapkan. Jalankan community-posts-schema.sql di Supabase SQL Editor.'}
          </div>
        )}

        {loadError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {language === 'en'
              ? `Failed to load community gallery: ${loadError}`
              : `Gagal memuat galeri komunitas: ${loadError}`}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[120px] md:auto-rows-[140px] grid-flow-dense gap-3 md:gap-4">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => setActivePost(post)}
                className={getCommunityTileClassName(post.layout_size)}
              >
                <figure className="relative group overflow-hidden rounded-xl bg-gray-100 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 h-full hover:-translate-y-1 hover:scale-[1.01]">
                  <img
                    src={getImageUrl(post.image_url)}
                    alt={post.caption || (language === 'en' ? 'Community post' : 'Post komunitas')}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                  />

                  {post.caption && (
                    <figcaption className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/70 to-transparent text-white text-xs sm:text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="line-clamp-2">{post.caption}</p>
                    </figcaption>
                  )}
                </figure>
              </button>
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">
              {language === 'en'
                ? 'No gallery posts yet. Check back soon.'
                : 'Belum ada post galeri. Cek lagi nanti.'}
            </p>
          </div>
        )}
      </div>

      {activePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label={language === 'en' ? 'Close preview' : 'Tutup pratinjau'}
            onClick={closeModal}
            className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
              modalReady ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <div
            className={`relative w-full max-w-5xl max-h-[92vh] transition-all duration-200 ${
              modalReady ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div className="relative flex items-center justify-center min-h-[50vh] max-h-[82vh] p-2 sm:p-4">
              <img
                src={getImageUrl(activePost.image_url)}
                alt={activePost.caption || (language === 'en' ? 'Community post' : 'Post komunitas')}
                className="max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl"
              />
            </div>

            {activePost.caption && (
              <div className="mx-auto mt-3 max-w-3xl px-4 py-2 rounded-xl bg-black/35 backdrop-blur-sm text-white text-sm text-center">
                <p className="line-clamp-2">{activePost.caption}</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
            aria-label={language === 'en' ? 'Close preview' : 'Tutup pratinjau'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}

