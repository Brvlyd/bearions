'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, Image as ImageIcon, X, Crop, Monitor, Smartphone } from 'lucide-react'
import { getImageUrl } from '@/lib/image-utils'
import { getErrorMessage } from '@/lib/errors'
import ImageEditorModal from '@/components/ImageEditorModal'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  MAX_HERO_DESKTOP_IMAGES,
  getHeroDesktopSizeGuides,
  getHeroMobileSizeGuide,
  type HeroImageDevice,
  type HeroImageRow,
  type HeroImageVariant,
} from '@/lib/hero-images'

// Shared admin manager for both landing_page_images and community_page_images:
// desktop gets a 1-6 photo grid, mobile gets a single slot. Reused across pages
// so the upload/crop/delete flow only exists in one place.
//
// Client-operated CMS page: plain Indonesian only, no bilingual toggle (see
// app/admin/dashboard/shipping/page.tsx for the same convention). Registered
// in scripts/check-i18n.mjs SINGLE_LANGUAGE_FILES.

const DESKTOP_SLOTS = Array.from({ length: MAX_HERO_DESKTOP_IMAGES }, (_, index) => index + 1)

type HeroTable = 'landing_page_images' | 'community_page_images'

type EditorTarget = {
  device: HeroImageDevice
  position: number
  file: File | null
  sourceUrl: string | null
}

type Props = {
  table: HeroTable
  /** Folder under the `product-images` storage bucket, e.g. 'landing' or 'community-hero'. */
  storagePathPrefix: string
  heading: string
  subheading: string
  /**
   * Shape of the slot on the public page. 'fullscreen' fills the viewport
   * (landing hero), 'banner' is the wide strip above the community gallery.
   * Drives the recommended sizes, the preview shape and the crop ratio, so
   * what the admin frames here is what visitors actually see.
   */
  variant?: HeroImageVariant
}

export default function HeroImageManager({
  table,
  storagePathPrefix,
  heading,
  subheading,
  variant = 'fullscreen',
}: Props) {
  const [device, setDevice] = useState<HeroImageDevice>('desktop')
  const [images, setImages] = useState<HeroImageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null)

  useEffect(() => {
    void loadImages()
    // Reload when the parent swaps tables (e.g. reused for two different pages
    // in the same admin session) — table is otherwise static per mount.
  }, [table])

  const loadImages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from(table).select('*')
      if (error) throw error
      setImages((data || []) as HeroImageRow[])
    } catch (error) {
      console.error(`Error loading ${table}:`, error)
      setMessage({ type: 'error', text: 'Gagal memuat gambar.' })
    } finally {
      setLoading(false)
    }
  }

  const desktopImages = images.filter((image) => image.device !== 'mobile')
  const mobileImage = images.find((image) => image.device === 'mobile')
  const desktopSizeGuides = getHeroDesktopSizeGuides(variant)
  const mobileSizeGuide = getHeroMobileSizeGuide(variant)
  const activeDesktopGuide =
    desktopSizeGuides.find((guide) => guide.count === Math.max(1, desktopImages.length)) ||
    desktopSizeGuides[0]
  const activeSizeGuide = device === 'mobile' ? mobileSizeGuide : activeDesktopGuide
  // The banner crops to a fixed box, so the editor locks to that ratio and the
  // slot preview is drawn in it. The landing hero's cells stretch with the
  // viewport, so there it stays a free crop against a rough preview shape.
  const isBanner = variant === 'banner'
  const previewAspect = (guide: { width: number; height: number }) => guide.width / guide.height

  const handleUpload = async (targetDevice: HeroImageDevice, position: number, file: File) => {
    const key = `${targetDevice}-${position}`

    try {
      setUploadingKey(key)
      setMessage(null)

      const fileExt = file.name.split('.').pop()
      const fileName = `${targetDevice}-${position}-${Date.now()}.${fileExt}`
      const filePath = `${storagePathPrefix}/${fileName}`

      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file)
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('product-images').getPublicUrl(filePath)

      const existing = images.find((image) => image.device === targetDevice && image.position === position)

      if (existing) {
        const { error: updateError } = await supabase
          .from(table)
          .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', existing.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from(table)
          .insert({ device: targetDevice, position, image_url: publicUrl })

        if (insertError) throw insertError
      }

      setMessage({ type: 'success', text: 'Gambar berhasil diunggah.' })
      await loadImages()
    } catch (error) {
      console.error('Error uploading hero image:', error)
      setMessage({ type: 'error', text: getErrorMessage(error) || 'Gagal mengunggah gambar.' })
    } finally {
      setUploadingKey(null)
    }
  }

  const handleDelete = async (targetDevice: HeroImageDevice, position: number) => {
    const key = `${targetDevice}-${position}`

    try {
      setUploadingKey(key)
      setMessage(null)

      const { error } = await supabase.from(table).delete().eq('device', targetDevice).eq('position', position)
      if (error) throw error

      setMessage({ type: 'success', text: 'Gambar berhasil dihapus.' })
      await loadImages()
    } catch (error) {
      console.error('Error deleting hero image:', error)
      setMessage({ type: 'error', text: getErrorMessage(error) || 'Gagal menghapus gambar.' })
    } finally {
      setUploadingKey(null)
    }
  }

  const handleFileSelect = (
    targetDevice: HeroImageDevice,
    position: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Pilih file gambar.' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ukuran gambar maksimal 5MB.' })
      return
    }

    setMessage(null)
    setEditorTarget({ device: targetDevice, position, file, sourceUrl: null })
    event.target.value = ''
  }

  const handleEditorApply = async (editedFile: File) => {
    const target = editorTarget
    if (!target) return

    setEditorTarget(null)
    await handleUpload(target.device, target.position, editedFile)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  const renderSlot = (targetDevice: HeroImageDevice, position: number, image: HeroImageRow | undefined, label: string) => {
    const key = `${targetDevice}-${position}`
    const isUploading = uploadingKey === key
    const slotGuide = targetDevice === 'mobile' ? mobileSizeGuide : activeDesktopGuide

    return (
      <div key={key} className="border-2 border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-bold text-black mb-4">{label}</h3>

        <div
          className={`${
            isBanner ? '' : targetDevice === 'mobile' ? 'aspect-9/16 max-w-56 mx-auto' : 'aspect-3/4'
          } bg-gray-100 rounded-lg mb-4 overflow-hidden relative`}
          style={isBanner ? { aspectRatio: previewAspect(slotGuide) } : undefined}
        >
          {image?.image_url ? (
            <img src={getImageUrl(image.image_url)} alt={label} className="w-full h-full object-cover" />
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

        <div className="flex gap-2">
          <label
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-center cursor-pointer transition flex items-center justify-center space-x-2 ${
              isUploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            <Upload className="w-5 h-5" />
            <span>{isUploading ? 'Mengunggah...' : image ? 'Ganti Gambar' : 'Upload Gambar'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isUploading}
              onChange={(event) => handleFileSelect(targetDevice, position, event)}
            />
          </label>

          {image && (
            <button
              type="button"
              onClick={() =>
                setEditorTarget({ device: targetDevice, position, file: null, sourceUrl: getImageUrl(image.image_url) })
              }
              disabled={isUploading}
              className="px-3 rounded-lg border border-gray-300 text-black hover:bg-gray-50 transition disabled:opacity-50"
              title="Atur ukuran"
            >
              <Crop className="w-5 h-5" />
            </button>
          )}

          {image && (
            <button
              type="button"
              onClick={() => handleDelete(targetDevice, position)}
              disabled={isUploading}
              className="px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {image && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Terakhir diperbarui:{' '}
            {new Date(image.updated_at || image.created_at || Date.now()).toLocaleDateString('id-ID')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black mb-1">{heading}</h2>
        <p className="text-gray-600">{subheading}</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-6 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => setDevice('desktop')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition ${
            device === 'desktop' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Monitor className="w-4 h-4" />
          Desktop
        </button>
        <button
          type="button"
          onClick={() => setDevice('mobile')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition ${
            device === 'mobile' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Mobile
        </button>
      </div>

      {/* Desktop and mobile are stored separately, and for a banner an empty
          device simply has no banner. Said out loud here because the admin only
          ever looks at one tab at a time. */}
      {isBanner && (desktopImages.length === 0 || !mobileImage) && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-900">
          {desktopImages.length === 0 && !mobileImage
            ? 'Belum ada foto banner sama sekali, jadi halaman tampil tanpa banner.'
            : desktopImages.length === 0
              ? 'Belum ada foto untuk Desktop, jadi banner hanya muncul di HP. Upload di tab Desktop kalau mau tampil juga di komputer.'
              : 'Belum ada foto untuk Mobile, jadi banner hanya muncul di komputer. Upload di tab Mobile kalau mau tampil juga di HP.'}
        </div>
      )}

      {device === 'desktop' ? (
        <>
          <p className="text-sm text-gray-600 mb-4">
            {isBanner
              ? 'Bisa upload 1 sampai 6 foto untuk tampilan desktop/PC. Foto disusun berdampingan mengisi kotak banner, jadi makin banyak foto makin sempit tiap fotonya.'
              : 'Bisa upload 1 sampai 6 foto untuk tampilan desktop/PC. Layout otomatis menyesuaikan jumlah foto.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {DESKTOP_SLOTS.map((position) =>
              renderSlot('desktop', position, desktopImages.find((image) => image.position === position), `Foto ${position}`)
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">
            {isBanner
              ? 'Khusus HP hanya bisa 1 foto — foto ini mengisi kotak banner yang lebar dan pendek, jadi pakai foto landscape (melebar), bukan foto potret.'
              : 'Khusus HP hanya bisa 1 foto — foto ini dipakai penuh sebagai latar saat halaman dibuka dari perangkat mobile.'}
          </p>
          <div className={isBanner ? 'max-w-md' : 'max-w-sm'}>
            {renderSlot('mobile', 1, mobileImage, 'Foto Mobile')}
          </div>
        </>
      )}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tips:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Ukuran file maksimal 5MB</li>
          <li>• Format yang didukung: JPG, PNG, WebP</li>
          <li>• Taruh objek utama di area tengah foto supaya tidak terpotong saat ukuran layar berubah</li>
          <li>• Tab Desktop dan Mobile tersimpan terpisah — upload keduanya supaya tampilan pas di semua perangkat</li>
        </ul>
      </div>

      <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-black mb-2">Rekomendasi Ukuran Gambar</h3>

        {device === 'desktop' ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Ukuran ini membantu mengurangi bagian foto yang terpotong saat jumlah foto desktop berubah.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-700">
                    <th className="py-2 pr-4 font-semibold">Total Foto</th>
                    <th className="py-2 pr-4 font-semibold">Rasio Ideal</th>
                    <th className="py-2 font-semibold">Ukuran Disarankan</th>
                  </tr>
                </thead>
                <tbody>
                  {desktopSizeGuides.map((guide) => (
                    <tr key={guide.count} className="border-b border-gray-100 last:border-b-0">
                      <td className="py-2 pr-4 text-gray-900">{guide.count} foto</td>
                      <td className="py-2 pr-4 text-gray-700">{guide.ratio}</td>
                      <td className="py-2 text-gray-700">{guide.size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-700">
            Rasio {mobileSizeGuide.ratio} ({isBanner ? 'melebar' : 'potret'}), sekitar {mobileSizeGuide.size} —{' '}
            {isBanner ? 'pas untuk kotak banner di HP.' : 'mengisi penuh layar HP.'}
          </p>
        )}
      </div>

      <ImageEditorModal
        open={!!editorTarget}
        file={editorTarget?.file || null}
        sourceUrl={editorTarget?.sourceUrl || null}
        defaultFit="cover"
        aspectLock={isBanner ? previewAspect(activeSizeGuide) : null}
        recommendedWidth={activeSizeGuide.width}
        recommendedHeight={activeSizeGuide.height}
        title={
          editorTarget
            ? `Atur gambar ${editorTarget.device === 'mobile' ? 'mobile' : `desktop ${editorTarget.position}`}`
            : undefined
        }
        description="Slot ini memotong gambar agar penuh, jadi atur framing di sini sebelum dipublikasikan."
        onCancel={() => setEditorTarget(null)}
        onApply={handleEditorApply}
      />
    </div>
  )
}
