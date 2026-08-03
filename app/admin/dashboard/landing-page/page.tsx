'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, Image as ImageIcon, X, Crop } from 'lucide-react'
import { getImageUrl } from '@/lib/image-utils'
import { useLanguage } from '@/lib/i18n'
import { getErrorMessage } from '@/lib/errors'
import ImageEditorModal from '@/components/ImageEditorModal'
import LoadingSpinner from '@/components/LoadingSpinner'

interface LandingPageImage {
  id: string
  position: number
  image_url: string
  created_at?: string
  updated_at?: string
}

const MAX_LANDING_IMAGES = 6
const LANDING_IMAGE_SLOTS = Array.from({ length: MAX_LANDING_IMAGES }, (_, index) => index + 1)
const LANDING_IMAGE_SIZE_GUIDE = [
  { count: 1, ratio: '16:9', size: '2560 x 1440 px', width: 2560, height: 1440 },
  { count: 2, ratio: '4:5', size: '1600 x 2000 px', width: 1600, height: 2000 },
  { count: 3, ratio: '2:3', size: '1400 x 2100 px', width: 1400, height: 2100 },
  { count: 4, ratio: '16:9', size: '1920 x 1080 px', width: 1920, height: 1080 },
  { count: 5, ratio: '4:3', size: '1600 x 1200 px', width: 1600, height: 1200 },
  { count: 6, ratio: '4:3', size: '1600 x 1200 px', width: 1600, height: 1200 }
]

export default function LandingPageManager() {
  const { language } = useLanguage()
  const [images, setImages] = useState<LandingPageImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  // Slot currently open in the live editor: a fresh file, or the stored image.
  const [editorTarget, setEditorTarget] = useState<
    { position: number; file: File | null; sourceUrl: string | null } | null
  >(null)

  const text = {
    failedLoadImages: language === 'en' ? 'Failed to load images' : 'Gagal memuat gambar',
    imageUploadSuccess: (position: number) =>
      language === 'en' ? `Image ${position} uploaded successfully!` : `Gambar ${position} berhasil diunggah!`,
    imageRemovedSuccess: (position: number) =>
      language === 'en' ? `Image ${position} removed successfully!` : `Gambar ${position} berhasil dihapus!`,
    failedUploadImage: language === 'en' ? 'Failed to upload image' : 'Gagal mengunggah gambar',
    failedDeleteImage: language === 'en' ? 'Failed to delete image' : 'Gagal menghapus gambar',
    selectImageFile: language === 'en' ? 'Please select an image file' : 'Silakan pilih file gambar',
    imageSizeLimit: language === 'en' ? 'Image size must be less than 5MB' : 'Ukuran gambar harus kurang dari 5MB',
    pageTitle: language === 'en' ? 'Landing Page Images' : 'Gambar Landing Page',
    pageSubtitle:
      language === 'en'
        ? 'Upload and manage landing page background images dynamically (1-6 images)'
        : 'Upload dan kelola gambar latar landing page secara dinamis (1-6 gambar)',
    imageLabel: (position: number) => (language === 'en' ? `Image ${position}` : `Gambar ${position}`),
    landingImageAlt: (position: number) =>
      language === 'en' ? `Landing page image ${position}` : `Gambar landing page ${position}`,
    uploading: language === 'en' ? 'Uploading...' : 'Mengunggah...',
    changeImage: language === 'en' ? 'Change Image' : 'Ganti Gambar',
    uploadImage: language === 'en' ? 'Upload Image' : 'Upload Gambar',
    removeImageAria: (position: number) => (language === 'en' ? `Remove image ${position}` : `Hapus gambar ${position}`),
    lastUpdated: language === 'en' ? 'Last updated' : 'Terakhir diperbarui',
    tipsTitle: language === 'en' ? 'Tips:' : 'Tips:',
    tipUploadCount: language === 'en' ? 'You can upload 1 to 6 images' : 'Anda bisa mengunggah 1 hingga 6 gambar',
    tipAdaptiveLayout:
      language === 'en'
        ? 'Landing page background layout adjusts automatically based on image count'
        : 'Layout background landing page otomatis menyesuaikan jumlah gambar',
    tipFollowSizeGuide: language === 'en' ? 'Follow the size guide below for best fit' : 'Ikuti panduan ukuran di bawah agar lebih pas',
    tipMaxFile: language === 'en' ? 'Maximum file size: 5MB' : 'Ukuran file maksimum: 5MB',
    tipFormats: language === 'en' ? 'Supported formats: JPG, PNG, WebP' : 'Format didukung: JPG, PNG, WebP',
    tipSafeArea:
      language === 'en'
        ? 'Keep main object in center safe area (middle 60%) to reduce cropping risk'
        : 'Simpan objek utama di area aman tengah (60% bagian tengah) untuk mengurangi risiko terpotong',
    tipConsistentTone:
      language === 'en'
        ? 'Use similar tone/lighting for a more consistent look'
        : 'Gunakan tone/pencahayaan yang serupa agar tampilan lebih konsisten',
    sizeGuideTitle:
      language === 'en'
        ? 'Recommended Image Size by Total Upload'
        : 'Rekomendasi Ukuran Gambar Berdasarkan Total Upload',
    sizeGuideSubtitle:
      language === 'en'
        ? 'These sizes help reduce cropping when the landing grid changes on desktop and mobile.'
        : 'Ukuran ini membantu mengurangi crop saat grid landing berubah di desktop dan mobile.',
    tableTotalImages: language === 'en' ? 'Total Images' : 'Total Gambar',
    tableIdealRatio: language === 'en' ? 'Ideal Ratio' : 'Rasio Ideal',
    tableSuggestedSize: language === 'en' ? 'Suggested Per-Image Size' : 'Saran Ukuran per Gambar',
    imageCount: (count: number) => (language === 'en' ? `${count} image${count > 1 ? 's' : ''}` : `${count} gambar`),
    adjustSize: language === 'en' ? 'Adjust size' : 'Atur ukuran',
    adjustSizeAria: (position: number) =>
      language === 'en' ? `Adjust size of image ${position}` : `Atur ukuran gambar ${position}`,
    editorTitle: (position: number) =>
      language === 'en' ? `Adjust landing image ${position}` : `Sesuaikan gambar landing ${position}`,
    editorDescription:
      language === 'en'
        ? 'The landing slot crops to fill, so frame the subject here before publishing.'
        : 'Slot landing memotong gambar agar penuh, jadi atur framing di sini sebelum dipublikasikan.',
  }

  // Suggested export size follows the guide for the number of published slots.
  const activeSizeGuide =
    LANDING_IMAGE_SIZE_GUIDE.find((guide) => guide.count === Math.max(1, images.length)) ||
    LANDING_IMAGE_SIZE_GUIDE[0]

  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('landing_page_images')
        .select('*')
        .order('position', { ascending: true })
        .limit(MAX_LANDING_IMAGES)

      if (error) throw error
      setImages(data || [])
    } catch (error) {
      console.error('Error loading images:', error)
      setMessage({ type: 'error', text: text.failedLoadImages })
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (position: number, file: File) => {
    try {
      setUploading(position)
      setMessage(null)

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `landing-${position}-${Date.now()}.${fileExt}`
      const filePath = `landing/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      // Update or insert image URL in database
      const existingImage = images.find(img => img.position === position)
      
      if (existingImage) {
        const { error: updateError } = await supabase
          .from('landing_page_images')
          .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('position', position)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('landing_page_images')
          .insert({ position, image_url: publicUrl })

        if (insertError) throw insertError
      }

      setMessage({ type: 'success', text: text.imageUploadSuccess(position) })
      loadImages()
    } catch (error) {
      console.error('Error uploading image:', error)
      setMessage({ type: 'error', text: getErrorMessage(error) || text.failedUploadImage })
    } finally {
      setUploading(null)
    }
  }

  const handleImageDelete = async (position: number) => {
    try {
      setUploading(position)
      setMessage(null)

      const { error } = await supabase
        .from('landing_page_images')
        .delete()
        .eq('position', position)

      if (error) throw error

      setMessage({ type: 'success', text: text.imageRemovedSuccess(position) })
      loadImages()
    } catch (error) {
      console.error('Error deleting image:', error)
      setMessage({ type: 'error', text: getErrorMessage(error) || text.failedDeleteImage })
    } finally {
      setUploading(null)
    }
  }

  const handleFileSelect = (position: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: text.selectImageFile })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: text.imageSizeLimit })
      return
    }

    // Frame it first: the slot crops hard, so let the admin see the result live.
    setMessage(null)
    setEditorTarget({ position, file, sourceUrl: null })
    e.target.value = ''
  }

  const handleEditorApply = async (editedFile: File) => {
    const target = editorTarget
    if (!target) return

    setEditorTarget(null)
    await handleImageUpload(target.position, editedFile)
  }

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">{text.pageTitle}</h1>
        <p className="text-gray-600">{text.pageSubtitle}</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {LANDING_IMAGE_SLOTS.map((position) => {
          const image = images.find(img => img.position === position)
          const isUploading = uploading === position

          return (
            <div key={position} className="border-2 border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-bold text-black mb-4">{text.imageLabel(position)}</h3>
              
              {/* Image Preview */}
              <div className="aspect-3/4 bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
                {image?.image_url ? (
                  <img
                    src={getImageUrl(image.image_url)}
                    alt={text.landingImageAlt(position)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-16 h-16" />
                  </div>
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <LoadingSpinner variant="light" />
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex gap-2">
                <label className={`flex-1 py-3 px-4 rounded-lg font-semibold text-center cursor-pointer transition flex items-center justify-center space-x-2 ${
                  isUploading 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-black text-white hover:bg-gray-800'
                }`}>
                  <Upload className="w-5 h-5" />
                  <span>{isUploading ? text.uploading : image ? text.changeImage : text.uploadImage}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => handleFileSelect(position, e)}
                  />
                </label>

                {image && (
                  <button
                    type="button"
                    onClick={() => setEditorTarget({ position, file: null, sourceUrl: getImageUrl(image.image_url) })}
                    disabled={isUploading}
                    className="px-3 rounded-lg border border-gray-300 text-black hover:bg-gray-50 transition disabled:opacity-50"
                    aria-label={text.adjustSizeAria(position)}
                    title={text.adjustSize}
                  >
                    <Crop className="w-5 h-5" />
                  </button>
                )}

                {image && (
                  <button
                    type="button"
                    onClick={() => handleImageDelete(position)}
                    disabled={isUploading}
                    className="px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:bg-red-300 disabled:cursor-not-allowed"
                    aria-label={text.removeImageAria(position)}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {image && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {text.lastUpdated}: {new Date(image.updated_at || image.created_at || Date.now()).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID')}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 {text.tipsTitle}</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• {text.tipUploadCount}</li>
          <li>• {text.tipAdaptiveLayout}</li>
          <li>• {text.tipFollowSizeGuide}</li>
          <li>• {text.tipMaxFile}</li>
          <li>• {text.tipFormats}</li>
          <li>• {text.tipSafeArea}</li>
          <li>• {text.tipConsistentTone}</li>
        </ul>
      </div>

      <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-black mb-2">{text.sizeGuideTitle}</h3>
        <p className="text-sm text-gray-600 mb-4">
          {text.sizeGuideSubtitle}
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-700">
                <th className="py-2 pr-4 font-semibold">{text.tableTotalImages}</th>
                <th className="py-2 pr-4 font-semibold">{text.tableIdealRatio}</th>
                <th className="py-2 font-semibold">{text.tableSuggestedSize}</th>
              </tr>
            </thead>
            <tbody>
              {LANDING_IMAGE_SIZE_GUIDE.map((guide) => (
                <tr key={guide.count} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-2 pr-4 text-gray-900">{text.imageCount(guide.count)}</td>
                  <td className="py-2 pr-4 text-gray-700">{guide.ratio}</td>
                  <td className="py-2 text-gray-700">{guide.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ImageEditorModal
        open={!!editorTarget}
        file={editorTarget?.file || null}
        sourceUrl={editorTarget?.sourceUrl || null}
        defaultFit="cover"
        recommendedWidth={activeSizeGuide.width}
        recommendedHeight={activeSizeGuide.height}
        title={editorTarget ? text.editorTitle(editorTarget.position) : undefined}
        description={text.editorDescription}
        onCancel={() => setEditorTarget(null)}
        onApply={handleEditorApply}
      />
    </div>
  )
}
