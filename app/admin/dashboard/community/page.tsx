'use client'

import { useEffect, useState } from 'react'
import { supabase, CommunityPost } from '@/lib/supabase'
import { getImageUrl } from '@/lib/image-utils'
import { Upload, Image as ImageIcon, Trash2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

type SupabaseErrorLike = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

type Message = {
  type: 'success' | 'error'
  text: string
}

const MAX_UPLOAD_DIMENSION = 4096
const IDEAL_RATIO_TEXT = '1:1'

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

  return {
    message,
    details,
    hint,
    code,
    isMissingTableError,
  }
}

export default function AdminCommunityGalleryPage() {
  const { language } = useLanguage()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedDimensions, setSelectedDimensions] = useState<{ width: number; height: number } | null>(null)
  const [caption, setCaption] = useState('')
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  const text = {
    unknownError: language === 'en' ? 'Unknown error' : 'Error tidak diketahui',
    failedLoadPrefix: language === 'en' ? 'Failed to load community posts' : 'Gagal memuat posting komunitas',
    failedUploadPrefix: language === 'en' ? 'Failed to upload post' : 'Gagal mengunggah posting',
    failedDeletePrefix: language === 'en' ? 'Failed to delete post' : 'Gagal menghapus posting',
    readImageDimensionError: language === 'en' ? 'Failed to read image dimensions' : 'Gagal membaca dimensi gambar',
    selectImageFile: language === 'en' ? 'Please select an image file' : 'Silakan pilih file gambar',
    imageMaxSize: language === 'en' ? 'Image size must be less than 5MB' : 'Ukuran gambar harus kurang dari 5MB',
    imageDimensionLimit: (max: number) =>
      language === 'en'
        ? `Maximum image dimension is ${max} x ${max}px`
        : `Dimensi maksimum gambar adalah ${max} x ${max}px`,
    chooseImageBeforePost: language === 'en' ? 'Please choose an image before posting' : 'Silakan pilih gambar sebelum posting',
    postUploaded: language === 'en' ? 'Post uploaded successfully!' : 'Posting berhasil diunggah!',
    postDeleted: language === 'en' ? 'Post deleted' : 'Posting dihapus',
    heading: language === 'en' ? 'Community Gallery' : 'Galeri Komunitas',
    subtitle:
      language === 'en'
        ? 'Post photos for users to see in the community gallery page.'
        : 'Upload foto agar pengguna bisa melihatnya di halaman galeri komunitas.',
    setupRequired: language === 'en' ? 'Setup required' : 'Perlu setup',
    setupRunSchema:
      language === 'en'
        ? 'Please run community-posts-schema.sql in Supabase SQL Editor, then refresh this page.'
        : 'Silakan jalankan community-posts-schema.sql di Supabase SQL Editor, lalu refresh halaman ini.',
    createNewPost: language === 'en' ? 'Create New Post' : 'Buat Post Baru',
    imageLabel: language === 'en' ? 'Image' : 'Gambar',
    chooseImage: language === 'en' ? 'Choose image' : 'Pilih gambar',
    fileInfo: (max: number) =>
      language === 'en'
        ? `Max 5MB, JPG/PNG/WebP, max ${max} x ${max}px`
        : `Maks 5MB, JPG/PNG/WebP, maks ${max} x ${max}px`,
    selectedDimensionLabel: language === 'en' ? 'Selected' : 'Terpilih',
    captionOptional: language === 'en' ? 'Caption (optional)' : 'Caption (opsional)',
    captionPlaceholder: language === 'en' ? 'Write a short caption...' : 'Tulis caption singkat...',
    posting: language === 'en' ? 'Posting...' : 'Memposting...',
    postToCommunity: language === 'en' ? 'Post to Community' : 'Posting ke Komunitas',
    uploadGuideTitle: language === 'en' ? 'Upload Guide (Admin)' : 'Panduan Upload (Admin)',
    guideIdealRatio:
      language === 'en'
        ? `Ideal ratio: ${IDEAL_RATIO_TEXT} (square) so gallery looks cleaner`
        : `Rasio ideal: ${IDEAL_RATIO_TEXT} (kotak) agar tampilan galeri lebih rapi`,
    guideRecommendedSizes:
      language === 'en'
        ? 'Recommended square sizes: 1080 x 1080 px or 1600 x 1600 px'
        : 'Ukuran kotak yang direkomendasikan: 1080 x 1080 px atau 1600 x 1600 px',
    guideFlexibleRatio:
      language === 'en'
        ? 'Portrait and landscape are allowed and will auto-arrange in masonry layout'
        : 'Portrait dan landscape diperbolehkan dan akan otomatis tersusun pada layout masonry',
    guideMaxDimension: (max: number) =>
      language === 'en'
        ? `Maximum dimension: ${max} x ${max} px`
        : `Dimensi maksimum: ${max} x ${max} px`,
    publishedGallery: language === 'en' ? 'Published Gallery' : 'Galeri Dipublikasikan',
    postsCount: (count: number) => (language === 'en' ? `${count} post(s)` : `${count} posting`),
    noPostsYet: language === 'en' ? 'No community posts yet.' : 'Belum ada posting komunitas.',
    noCaption: language === 'en' ? 'No caption' : 'Tanpa caption',
    deletePostAria: language === 'en' ? 'Delete post' : 'Hapus posting',
  }

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        const parsed = parseErrorInfo(error, text.unknownError)

        if (parsed.isMissingTableError) {
          setSchemaMissing(true)
          setPosts([])
          return
        }

        setSchemaMissing(false)
        setMessage({ type: 'error', text: `${text.failedLoadPrefix}: ${parsed.message} (${parsed.code})` })
        console.error('Error loading community posts:', parsed)
        return
      }

      setSchemaMissing(false)
      setPosts((data || []) as CommunityPost[])
    } catch (error) {
      const parsed = parseErrorInfo(error, text.unknownError)
      console.error('Error loading community posts:', parsed)
      setMessage({ type: 'error', text: `${text.failedLoadPrefix}: ${parsed.message} (${parsed.code})` })
    } finally {
      setLoading(false)
    }
  }

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const image = new Image()
      const objectUrl = URL.createObjectURL(file)

      image.onload = () => {
        resolve({ width: image.width, height: image.height })
        URL.revokeObjectURL(objectUrl)
      }

      image.onerror = () => {
        reject(new Error(text.readImageDimensionError))
        URL.revokeObjectURL(objectUrl)
      }

      image.src = objectUrl
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      setSelectedFile(null)
      setSelectedDimensions(null)
      return
    }

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: text.selectImageFile })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: text.imageMaxSize })
      return
    }

    try {
      const dimensions = await getImageDimensions(file)

      if (dimensions.width > MAX_UPLOAD_DIMENSION || dimensions.height > MAX_UPLOAD_DIMENSION) {
        setMessage({
          type: 'error',
          text: text.imageDimensionLimit(MAX_UPLOAD_DIMENSION),
        })
        return
      }

      setSelectedDimensions(dimensions)
    } catch {
      setMessage({ type: 'error', text: text.readImageDimensionError })
      return
    }

    setMessage(null)
    setSelectedFile(file)
  }

  const handleUploadPost = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: text.chooseImageBeforePost })
      return
    }

    try {
      setUploading(true)
      setMessage(null)

      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `community-${Date.now()}.${fileExt}`
      const filePath = `community/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      const { data: authData } = await supabase.auth.getUser()

      const { error: insertError } = await supabase
        .from('community_posts')
        .insert({
          image_url: publicUrlData.publicUrl,
          caption: caption.trim() || null,
          created_by: authData.user?.id || null,
        })

      if (insertError) throw insertError

      setMessage({ type: 'success', text: text.postUploaded })
      setCaption('')
      setSelectedFile(null)
      setSelectedDimensions(null)
      await loadPosts()
    } catch (error) {
      const parsed = parseErrorInfo(error, text.unknownError)
      console.error('Error uploading community post:', parsed)
      setMessage({ type: 'error', text: `${text.failedUploadPrefix}: ${parsed.message} (${parsed.code})` })
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      setMessage({ type: 'success', text: text.postDeleted })
      setPosts((prev) => prev.filter((post) => post.id !== postId))
    } catch (error) {
      const parsed = parseErrorInfo(error, text.unknownError)
      console.error('Error deleting community post:', parsed)
      setMessage({ type: 'error', text: `${text.failedDeletePrefix}: ${parsed.message} (${parsed.code})` })
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-black mb-2">{text.heading}</h2>
        <p className="text-gray-600">{text.subtitle}</p>
      </div>

      {schemaMissing && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">{text.setupRequired}</h3>
          <p className="text-sm text-yellow-800">
            {text.setupRunSchema}
          </p>
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-black mb-4">{text.createNewPost}</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">{text.imageLabel}</label>
            <label className="w-full border border-gray-300 rounded-lg p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition">
              <Upload className="w-5 h-5" />
              <span className="text-sm text-gray-700">{selectedFile ? selectedFile.name : text.chooseImage}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading || schemaMissing}
                onChange={handleFileSelect}
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">{text.fileInfo(MAX_UPLOAD_DIMENSION)}</p>
            {selectedDimensions && (
              <p className="text-xs text-gray-600 mt-1">
                {text.selectedDimensionLabel}: {selectedDimensions.width} x {selectedDimensions.height}px
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">{text.captionOptional}</label>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder={text.captionPlaceholder}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black"
              disabled={uploading || schemaMissing}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleUploadPost}
          disabled={!selectedFile || uploading || schemaMissing}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          <Upload className="w-4 h-4" />
          {uploading ? text.posting : text.postToCommunity}
        </button>

        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
          <p className="font-semibold mb-1">{text.uploadGuideTitle}</p>
          <ul className="space-y-1 text-blue-800">
            <li>• {text.guideIdealRatio}</li>
            <li>• {text.guideRecommendedSizes}</li>
            <li>• {text.guideFlexibleRatio}</li>
            <li>• {text.guideMaxDimension(MAX_UPLOAD_DIMENSION)}</li>
          </ul>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-black">{text.publishedGallery}</h3>
        <span className="text-sm text-gray-600">{text.postsCount(posts.length)}</span>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg bg-white">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">{text.noPostsYet}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="aspect-square bg-gray-100">
                <img
                  src={getImageUrl(post.image_url)}
                  alt={post.caption || (language === 'en' ? 'Community post image' : 'Gambar posting komunitas')}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-700 line-clamp-2 min-h-10">
                  {post.caption || text.noCaption}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    className="text-red-600 hover:text-red-700 transition"
                    aria-label={text.deletePostAria}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
