'use client'

import { useEffect, useState } from 'react'
import { supabase, CommunityPost } from '@/lib/supabase'
import { getImageUrl } from '@/lib/image-utils'
import { Upload, Image as ImageIcon, Trash2, ArrowUp, ArrowDown, Crop } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import ImageEditorModal from '@/components/ImageEditorModal'
import Pagination from '@/components/Pagination'
import LoadingSpinner from '@/components/LoadingSpinner'
import { usePagination } from '@/lib/hooks/usePagination'
import {
  DEFAULT_COMMUNITY_LAYOUT_SIZE,
  getCommunityTileClassName,
  normalizeCommunityLayoutSize,
  type CommunityLayoutSize,
} from '@/lib/community-layout'

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
const POSTS_PER_PAGE = 16

// Each tile shape crops to a fixed ratio in the public grid, so the editor
// starts from the ratio the chosen layout will actually render at.
const LAYOUT_ASPECT: Record<CommunityLayoutSize, number> = { s: 1, m: 0.5, w: 2, l: 1 }
const LAYOUT_EXPORT_WIDTH: Record<CommunityLayoutSize, number> = { s: 1080, m: 1080, w: 2160, l: 2160 }

type EditorTarget = {
  /** 'new' frames the post being composed, 'existing' re-frames a published one. */
  kind: 'new' | 'existing'
  postId?: string
  layoutSize: CommunityLayoutSize
  file: File | null
  sourceUrl: string | null
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

export default function AdminCommunityGalleryPage() {
  const { language } = useLanguage()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedDimensions, setSelectedDimensions] = useState<{ width: number; height: number } | null>(null)
  const [selectedLayoutSize, setSelectedLayoutSize] = useState<CommunityLayoutSize>(DEFAULT_COMMUNITY_LAYOUT_SIZE)
  const [caption, setCaption] = useState('')
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null)
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null)

  const { page, setPage, totalPages, pageItems, firstItemIndex, lastItemIndex, totalItems } =
    usePagination(posts, POSTS_PER_PAGE)

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
    layoutSetupRunSchema:
      language === 'en'
        ? 'Run add-community-layout-columns.sql in Supabase SQL Editor to enable tetris layout controls.'
        : 'Jalankan add-community-layout-columns.sql di Supabase SQL Editor untuk mengaktifkan kontrol layout tetris.',
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
    layoutLabel: language === 'en' ? 'Tile Layout' : 'Layout Tile',
    layoutSmall: language === 'en' ? 'Small (1x1)' : 'Kecil (1x1)',
    layoutPortrait: language === 'en' ? 'Portrait (1x2)' : 'Portrait (1x2)',
    layoutWide: language === 'en' ? 'Wide (2x1)' : 'Lebar (2x1)',
    layoutLarge: language === 'en' ? 'Large (2x2)' : 'Besar (2x2)',
    updateLayoutFailed: language === 'en' ? 'Failed to update layout' : 'Gagal memperbarui layout',
    moveUp: language === 'en' ? 'Move up' : 'Naikkan',
    moveDown: language === 'en' ? 'Move down' : 'Turunkan',
    moveFailed: language === 'en' ? 'Failed to move post' : 'Gagal memindahkan posting',
    layoutUpdated: language === 'en' ? 'Layout updated' : 'Layout diperbarui',
    moved: language === 'en' ? 'Post order updated' : 'Urutan posting diperbarui',
    guideFlexibleRatio:
      language === 'en'
        ? 'Admin can mix portrait/landscape and set tile size to build tetris-like composition'
        : 'Admin bisa mencampur portrait/landscape dan memilih ukuran tile untuk komposisi seperti tetris',
    guideMaxDimension: (max: number) =>
      language === 'en'
        ? `Maximum dimension: ${max} x ${max} px`
        : `Dimensi maksimum: ${max} x ${max} px`,
    publishedGallery: language === 'en' ? 'Published Gallery' : 'Galeri Dipublikasikan',
    postsCount: (count: number) => (language === 'en' ? `${count} post(s)` : `${count} posting`),
    noPostsYet: language === 'en' ? 'No community posts yet.' : 'Belum ada posting komunitas.',
    noCaption: language === 'en' ? 'No caption' : 'Tanpa caption',
    deletePostAria: language === 'en' ? 'Delete post' : 'Hapus posting',
    adjustSize: language === 'en' ? 'Adjust size' : 'Atur ukuran',
    adjustPostAria: language === 'en' ? 'Adjust post image size' : 'Atur ukuran gambar posting',
    editorTitle: language === 'en' ? 'Adjust post image' : 'Sesuaikan gambar posting',
    editorDescription:
      language === 'en'
        ? 'Gallery tiles crop to fill, so frame the subject here before it goes public.'
        : 'Tile galeri dipotong agar penuh, jadi atur framing di sini sebelum tayang.',
    postImageUpdated: language === 'en' ? 'Post image updated' : 'Gambar posting diperbarui',
    updatePostImageFailed:
      language === 'en' ? 'Failed to update post image' : 'Gagal memperbarui gambar posting',
    selectedPreviewLabel: language === 'en' ? 'Ready to post' : 'Siap diposting',
  }

  useEffect(() => {
    loadPosts()
  }, [])

  // Preview the framed file exactly as it will be uploaded.
  useEffect(() => {
    if (!selectedFile) {
      setSelectedPreview(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setSelectedPreview(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedFile])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('layout_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) {
        const parsed = parseErrorInfo(error, text.unknownError)

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
            setPosts(normalizedPosts)
            setMessage({ type: 'error', text: text.layoutSetupRunSchema })
            return
          }
        }

        setSchemaMissing(false)
        setMessage({ type: 'error', text: `${text.failedLoadPrefix}: ${parsed.message} (${parsed.code})` })
        console.error('Error loading community posts:', parsed)
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

    // Frame it before it becomes the post image.
    setMessage(null)
    setEditorTarget({ kind: 'new', layoutSize: selectedLayoutSize, file, sourceUrl: null })
    event.target.value = ''
  }

  /** Applies the framed result: staged for a new post, uploaded for an existing one. */
  const handleEditorApply = async (editedFile: File) => {
    const target = editorTarget
    if (!target) return

    if (target.kind === 'new') {
      setSelectedFile(editedFile)
      try {
        setSelectedDimensions(await getImageDimensions(editedFile))
      } catch {
        setSelectedDimensions(null)
      }
      setEditorTarget(null)
      return
    }

    if (!target.postId) return

    try {
      setUploading(true)
      setMessage(null)

      const fileExt = editedFile.name.split('.').pop()
      const filePath = `community/community-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, editedFile)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('community_posts')
        .update({ image_url: publicUrlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', target.postId)

      if (updateError) throw updateError

      setPosts((prev) => prev.map((post) => (
        post.id === target.postId ? { ...post, image_url: publicUrlData.publicUrl } : post
      )))
      setMessage({ type: 'success', text: text.postImageUpdated })
    } catch (error) {
      const parsed = parseErrorInfo(error, text.unknownError)
      console.error('Error updating post image:', parsed)
      setMessage({ type: 'error', text: `${text.updatePostImageFailed}: ${parsed.message} (${parsed.code})` })
    } finally {
      setUploading(false)
      setEditorTarget(null)
    }
  }

  const handleUploadPost = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: text.chooseImageBeforePost })
      return
    }

    try {
      setUploading(true)
      setMessage(null)

      const nextLayoutOrder = posts.reduce((max, post) => {
        const value = Number(post.layout_order || 0)
        return value > max ? value : max
      }, 0) + 1

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
          layout_size: selectedLayoutSize,
          layout_order: nextLayoutOrder,
          created_by: authData.user?.id || null,
        })

      if (insertError) throw insertError

      setMessage({ type: 'success', text: text.postUploaded })
      setCaption('')
      setSelectedLayoutSize(DEFAULT_COMMUNITY_LAYOUT_SIZE)
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

  const handleUpdatePostLayout = async (postId: string, layoutSize: CommunityLayoutSize) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .update({ layout_size: layoutSize, updated_at: new Date().toISOString() })
        .eq('id', postId)

      if (error) throw error

      setPosts((prev) => prev.map((post) => (
        post.id === postId ? { ...post, layout_size: layoutSize } : post
      )))
      setMessage({ type: 'success', text: text.layoutUpdated })
    } catch (error) {
      const parsed = parseErrorInfo(error, text.unknownError)
      console.error('Error updating post layout:', parsed)
      setMessage({ type: 'error', text: `${text.updateLayoutFailed}: ${parsed.message} (${parsed.code})` })
    }
  }

  const handleMovePost = async (postId: string, direction: 'up' | 'down') => {
    const orderedPosts = [...posts].sort((a, b) => (a.layout_order || 0) - (b.layout_order || 0))
    const currentIndex = orderedPosts.findIndex((post) => post.id === postId)

    if (currentIndex < 0) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= orderedPosts.length) return

    const currentPost = orderedPosts[currentIndex]
    const targetPost = orderedPosts[targetIndex]
    const currentOrder = currentPost.layout_order || currentIndex + 1
    const targetOrder = targetPost.layout_order || targetIndex + 1

    try {
      const { error: firstError } = await supabase
        .from('community_posts')
        .update({ layout_order: targetOrder, updated_at: new Date().toISOString() })
        .eq('id', currentPost.id)

      if (firstError) throw firstError

      const { error: secondError } = await supabase
        .from('community_posts')
        .update({ layout_order: currentOrder, updated_at: new Date().toISOString() })
        .eq('id', targetPost.id)

      if (secondError) throw secondError

      await loadPosts()
      setMessage({ type: 'success', text: text.moved })
    } catch (error) {
      const parsed = parseErrorInfo(error, text.unknownError)
      console.error('Error moving post:', parsed)
      setMessage({ type: 'error', text: `${text.moveFailed}: ${parsed.message} (${parsed.code})` })
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

            {selectedPreview && selectedFile && (
              <div className="mt-3 flex items-start gap-3">
                <div className="h-24 w-24 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                  <img
                    src={selectedPreview}
                    alt={text.selectedPreviewLabel}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditorTarget({
                      kind: 'new',
                      layoutSize: selectedLayoutSize,
                      file: selectedFile,
                      sourceUrl: null,
                    })
                  }
                  disabled={uploading || schemaMissing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-xs text-black hover:bg-gray-50 disabled:opacity-50"
                >
                  <Crop className="w-3.5 h-3.5" />
                  {text.adjustSize}
                </button>
              </div>
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

            <label className="block text-sm font-medium text-black mb-2 mt-4">{text.layoutLabel}</label>
            <select
              value={selectedLayoutSize}
              onChange={(event) => setSelectedLayoutSize(event.target.value as CommunityLayoutSize)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black"
              disabled={uploading || schemaMissing}
            >
              <option value="s">{text.layoutSmall}</option>
              <option value="m">{text.layoutPortrait}</option>
              <option value="w">{text.layoutWide}</option>
              <option value="l">{text.layoutLarge}</option>
            </select>
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
        <LoadingSpinner />
      ) : posts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg bg-white">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">{text.noPostsYet}</p>
        </div>
      ) : (
        <div id="community-posts" className="grid grid-cols-2 md:grid-cols-4 auto-rows-[120px] md:auto-rows-[140px] grid-flow-dense gap-4">
          {pageItems.map((post, pageIndex) => {
            // Reordering compares against the whole list, not just this page.
            const index = firstItemIndex - 1 + pageIndex
            return (
            <div
              key={post.id}
              className={`relative bg-white border border-gray-200 rounded-lg overflow-hidden group shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg ${getCommunityTileClassName(post.layout_size)}`}
            >
              <div className="absolute inset-0 bg-gray-100">
                <img
                  src={getImageUrl(post.image_url)}
                  alt={post.caption || (language === 'en' ? 'Community post image' : 'Gambar posting komunitas')}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                />
              </div>

              <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/75 to-transparent">
                <p className="text-xs text-white line-clamp-2 min-h-8">
                  {post.caption || text.noCaption}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-white/80">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMovePost(post.id, 'up')}
                      disabled={index === 0}
                      className="h-9 w-9 inline-flex items-center justify-center rounded bg-white/85 text-black disabled:opacity-40"
                      aria-label={text.moveUp}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMovePost(post.id, 'down')}
                      disabled={index === posts.length - 1}
                      className="h-9 w-9 inline-flex items-center justify-center rounded bg-white/85 text-black disabled:opacity-40"
                      aria-label={text.moveDown}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <select
                    value={normalizeCommunityLayoutSize(post.layout_size)}
                    onChange={(event) => handleUpdatePostLayout(post.id, event.target.value as CommunityLayoutSize)}
                    className="h-9 rounded px-2 text-xs text-black bg-white/90"
                  >
                    <option value="s">{text.layoutSmall}</option>
                    <option value="m">{text.layoutPortrait}</option>
                    <option value="w">{text.layoutWide}</option>
                    <option value="l">{text.layoutLarge}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setEditorTarget({
                        kind: 'existing',
                        postId: post.id,
                        layoutSize: normalizeCommunityLayoutSize(post.layout_size),
                        file: null,
                        sourceUrl: getImageUrl(post.image_url),
                      })
                    }
                    className="h-9 w-9 inline-flex items-center justify-center rounded bg-white/85 text-black"
                    aria-label={text.adjustPostAria}
                    title={text.adjustSize}
                  >
                    <Crop className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    className="h-9 w-9 inline-flex items-center justify-center rounded bg-red-500/90 text-white"
                    aria-label={text.deletePostAria}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {!loading && posts.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          firstItemIndex={firstItemIndex}
          lastItemIndex={lastItemIndex}
          totalItems={totalItems}
          itemLabel={{ en: 'posts', id: 'post' }}
          scrollTargetId="community-posts"
        />
      )}

      <ImageEditorModal
        open={!!editorTarget}
        file={editorTarget?.file || null}
        sourceUrl={editorTarget?.sourceUrl || null}
        defaultFit="cover"
        aspectLock={editorTarget ? LAYOUT_ASPECT[editorTarget.layoutSize] : null}
        recommendedWidth={editorTarget ? LAYOUT_EXPORT_WIDTH[editorTarget.layoutSize] : undefined}
        recommendedHeight={
          editorTarget
            ? Math.round(LAYOUT_EXPORT_WIDTH[editorTarget.layoutSize] / LAYOUT_ASPECT[editorTarget.layoutSize])
            : undefined
        }
        maxOutputDimension={MAX_UPLOAD_DIMENSION}
        title={text.editorTitle}
        description={text.editorDescription}
        onCancel={() => setEditorTarget(null)}
        onApply={handleEditorApply}
      />
    </div>
  )
}
