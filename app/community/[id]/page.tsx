'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n'
import Link from 'next/link'
import { CommunityPost, supabase } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'
import { getImageUrl } from '@/lib/image-utils'

export default function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { language } = useLanguage()
  const [post, setPost] = useState<CommunityPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [productId, setProductId] = useState<string>('')
  const [errorText, setErrorText] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setProductId(p.id))
  }, [params])

  useEffect(() => {
    if (productId) {
      loadPost(productId)
    }
  }, [productId])

  const loadPost = async (id: string) => {
    try {
      setLoading(true)
      setErrorText(null)

      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      setPost(data as CommunityPost)
    } catch (error) {
      console.error('Error loading community post:', error)
      setErrorText(language === 'en' ? 'Failed to load post.' : 'Gagal memuat post.')
      setPost(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 text-black">
            {language === 'en' ? 'Post not found' : 'Post tidak ditemukan'}
          </h1>
          {errorText && <p className="text-sm text-gray-600 mb-4">{errorText}</p>}
          <Link href="/community" className="text-black underline">
            {language === 'en' ? 'Back to Community' : 'Kembali ke Komunitas'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{language === 'en' ? 'Back to Gallery' : 'Kembali ke Galeri'}</span>
        </Link>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
            <img
              src={getImageUrl(post.image_url)}
              alt={post.caption || (language === 'en' ? 'Community post image' : 'Gambar post komunitas')}
              className="max-w-full max-h-[78vh] w-auto h-auto object-contain rounded-xl"
            />
          </div>

          <div className="px-4 md:px-8 pb-6 md:pb-8">
            {post.caption && <p className="text-white text-base mb-2">{post.caption}</p>}
            <p className="text-sm text-gray-400">
              {language === 'en' ? 'Posted on' : 'Diposting pada'}{' '}
              {new Date(post.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
