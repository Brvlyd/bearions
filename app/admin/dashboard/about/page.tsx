'use client'

import { useEffect, useState } from 'react'
import { Upload, Image as ImageIcon, Save, Plus, Trash2, Type } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { AboutUsContentBlock, supabase } from '@/lib/supabase'
import { DEFAULT_ABOUT_US_CONTENT, loadAboutUsContent, parseAboutUsError } from '@/lib/about-us'

type Message = {
  type: 'success' | 'error'
  text: string
}

type AboutFormState = {
  title: string
  headline: string
  content_blocks: AboutUsContentBlock[]
  background_image_url: string | null
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const createTextBlock = (): AboutUsContentBlock => ({
  id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type: 'text',
  text: '',
})

const createImageBlock = (): AboutUsContentBlock => ({
  id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type: 'image',
  image_url: '',
})

export default function AdminAboutPage() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [form, setForm] = useState<AboutFormState>({
    title: DEFAULT_ABOUT_US_CONTENT.title,
    headline: DEFAULT_ABOUT_US_CONTENT.headline,
    content_blocks: DEFAULT_ABOUT_US_CONTENT.content_blocks || [],
    background_image_url: DEFAULT_ABOUT_US_CONTENT.background_image_url,
  })

  const text = {
    pageTitle: language === 'en' ? 'About Us Manager' : 'Pengelola Tentang Kami',
    pageSubtitle:
      language === 'en'
        ? 'Edit About Us content with dynamic text/image blocks and preview in real time.'
        : 'Ubah konten Tentang Kami dengan blok teks/gambar dinamis dan preview real-time.',
    setupRequired: language === 'en' ? 'Setup required' : 'Perlu setup',
    setupHelp:
      language === 'en'
        ? 'Run about-us-schema.sql in Supabase SQL Editor, then refresh this page.'
        : 'Jalankan about-us-schema.sql di Supabase SQL Editor, lalu refresh halaman ini.',
    migrationHelp:
      language === 'en'
        ? 'Run add-about-us-builder-columns.sql in Supabase SQL Editor for existing databases, then refresh this page.'
        : 'Jalankan add-about-us-builder-columns.sql di Supabase SQL Editor untuk database lama, lalu refresh halaman ini.',
    title: language === 'en' ? 'Title' : 'Judul',
    headline: language === 'en' ? 'Headline' : 'Headline',
    contentBlocks: language === 'en' ? 'Content Blocks' : 'Blok Konten',
    addTextBlock: language === 'en' ? 'Add Textbox' : 'Tambah Textbox',
    addImageBlock: language === 'en' ? 'Add Picture' : 'Tambah Gambar',
    textContent: language === 'en' ? 'Text Content' : 'Isi Teks',
    imageUrl: language === 'en' ? 'Image URL' : 'URL Gambar',
    imageUploadHint: language === 'en' ? 'or upload image' : 'atau upload gambar',
    removeBlock: language === 'en' ? 'Remove block' : 'Hapus blok',
    textPlaceholder:
      language === 'en'
        ? 'Write your about us content here...'
        : 'Tulis konten tentang kami di sini...',
    headlinePlaceholder:
      language === 'en'
        ? 'Write your short headline'
        : 'Tulis headline singkat',
    titlePlaceholder: language === 'en' ? 'About Us' : 'Tentang Kami',
    emptyBlocks:
      language === 'en'
        ? 'No content block yet. Add textbox or picture block.'
        : 'Belum ada blok konten. Tambahkan textbox atau gambar.',
    backgroundImage: language === 'en' ? 'Background Image' : 'Gambar Latar Belakang',
    chooseImage: language === 'en' ? 'Choose image' : 'Pilih gambar',
    uploadTip: language === 'en' ? 'Recommended minimum: 1920 x 1080, max 5MB' : 'Rekomendasi minimal: 1920 x 1080, maks 5MB',
    imageTypeError: language === 'en' ? 'Please select a valid image file (JPG, PNG, WebP)' : 'Pilih file gambar valid (JPG, PNG, WebP)',
    imageSizeError: language === 'en' ? 'Image must be smaller than 5MB' : 'Ukuran gambar harus kurang dari 5MB',
    uploadFailed: language === 'en' ? 'Failed to upload image' : 'Gagal mengunggah gambar',
    saveChanges: language === 'en' ? 'Save Changes' : 'Simpan Perubahan',
    saving: language === 'en' ? 'Saving...' : 'Menyimpan...',
    saveSuccess: language === 'en' ? 'About Us updated successfully!' : 'About Us berhasil diperbarui!',
    saveFailed: language === 'en' ? 'Failed to save About Us content' : 'Gagal menyimpan konten About Us',
    loadFailed: language === 'en' ? 'Failed to load About Us content' : 'Gagal memuat konten About Us',
    previewTitle: language === 'en' ? 'Live Preview' : 'Preview Langsung',
    noBackground: language === 'en' ? 'No background image selected' : 'Belum ada gambar latar belakang',
    uploadForBlockFailed: language === 'en' ? 'Failed to upload block image' : 'Gagal mengunggah gambar blok',
    blockImageAlt: language === 'en' ? 'About content image' : 'Gambar konten tentang kami',
  }

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const result = await loadAboutUsContent()

      setSchemaMissing(result.tableMissing)
      setForm({
        title: result.data.title,
        headline: result.data.headline,
        content_blocks: result.data.content_blocks || [],
        background_image_url: result.data.background_image_url,
      })

      if (result.error && !result.tableMissing) {
        setMessage({ type: 'error', text: `${text.loadFailed}: ${result.error.message} (${result.error.code})` })
      }

      setLoading(false)
    }

    run()
  }, [])

  const updateField = (field: keyof AboutFormState, value: string | null | AboutUsContentBlock[]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addBlock = (type: 'text' | 'image') => {
    setForm((prev) => ({
      ...prev,
      content_blocks: [...prev.content_blocks, type === 'text' ? createTextBlock() : createImageBlock()],
    }))
  }

  const removeBlock = (blockId: string) => {
    setForm((prev) => ({
      ...prev,
      content_blocks: prev.content_blocks.filter((block) => block.id !== blockId),
    }))
  }

  const updateBlockText = (blockId: string, textValue: string) => {
    setForm((prev) => ({
      ...prev,
      content_blocks: prev.content_blocks.map((block) => (
        block.id === blockId && block.type === 'text' ? { ...block, text: textValue } : block
      )),
    }))
  }

  const updateBlockImage = (blockId: string, imageUrl: string) => {
    setForm((prev) => ({
      ...prev,
      content_blocks: prev.content_blocks.map((block) => (
        block.id === blockId && block.type === 'image' ? { ...block, image_url: imageUrl } : block
      )),
    }))
  }

  const uploadImageFile = async (file: File, prefix: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${prefix}-${Date.now()}.${fileExt}`
    const filePath = `about/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return publicUrlData.publicUrl
  }

  const handleBackgroundSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: text.imageTypeError })
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage({ type: 'error', text: text.imageSizeError })
      return
    }

    try {
      setUploading(true)
      setMessage(null)

      const publicUrl = await uploadImageFile(file, 'about-bg')
      updateField('background_image_url', publicUrl)
    } catch (error) {
      const parsed = parseAboutUsError(error)
      setMessage({ type: 'error', text: `${text.uploadFailed}: ${parsed.message} (${parsed.code})` })
    } finally {
      setUploading(false)
    }
  }

  const handleBlockImageSelect = async (event: React.ChangeEvent<HTMLInputElement>, blockId: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: text.imageTypeError })
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage({ type: 'error', text: text.imageSizeError })
      return
    }

    try {
      setUploading(true)
      const publicUrl = await uploadImageFile(file, `about-block-${blockId}`)
      updateBlockImage(blockId, publicUrl)
    } catch (error) {
      const parsed = parseAboutUsError(error)
      setMessage({ type: 'error', text: `${text.uploadForBlockFailed}: ${parsed.message} (${parsed.code})` })
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (schemaMissing) {
      setMessage({ type: 'error', text: text.setupHelp })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      const { data: authData } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('about_us_content')
        .upsert({
          id: 1,
          title: form.title.trim(),
          headline: form.headline.trim(),
          content_blocks: form.content_blocks,
          background_image_url: form.background_image_url,
          updated_at: new Date().toISOString(),
          updated_by: authData.user?.id || null,
        })

      if (error) throw error

      setMessage({ type: 'success', text: text.saveSuccess })
    } catch (error) {
      const parsed = parseAboutUsError(error)
      if (parsed.isMissingTableError) {
        setSchemaMissing(true)
        setMessage({ type: 'error', text: text.setupHelp })
      } else if (parsed.isMissingBuilderColumns) {
        setSchemaMissing(true)
        setMessage({ type: 'error', text: text.migrationHelp })
      } else {
        setMessage({ type: 'error', text: `${text.saveFailed}: ${parsed.message} (${parsed.code})` })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-black mb-2">{text.pageTitle}</h2>
        <p className="text-gray-600">{text.pageSubtitle}</p>
      </div>

      {schemaMissing && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-1">{text.setupRequired}</h3>
          <p className="text-sm text-yellow-800">{text.setupHelp}</p>
        </div>
      )}

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">{text.backgroundImage}</label>
              <label className="w-full border border-gray-300 rounded-lg p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition">
                <Upload className="w-5 h-5" />
                <span className="text-sm text-gray-700">{uploading ? text.saving : text.chooseImage}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading || saving || schemaMissing}
                  onChange={handleBackgroundSelect}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">{text.uploadTip}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">{text.title}</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder={text.titlePlaceholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">{text.headline}</label>
              <textarea
                value={form.headline}
                onChange={(event) => updateField('headline', event.target.value)}
                rows={3}
                placeholder={text.headlinePlaceholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />
            </div>

            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-black">{text.contentBlocks}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addBlock('text')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-black hover:bg-gray-50"
                  >
                    <Type className="w-3.5 h-3.5" />
                    {text.addTextBlock}
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock('image')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-black hover:bg-gray-50"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    {text.addImageBlock}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {form.content_blocks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500">
                    {text.emptyBlocks}
                  </div>
                )}

                {form.content_blocks.map((block) => (
                  <div key={block.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {block.type === 'text' ? text.textContent : text.backgroundImage}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                        aria-label={text.removeBlock}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {text.removeBlock}
                      </button>
                    </div>

                    {block.type === 'text' ? (
                      <textarea
                        value={block.text || ''}
                        onChange={(event) => updateBlockText(block.id, event.target.value)}
                        rows={4}
                        placeholder={text.textPlaceholder}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                      />
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={block.image_url || ''}
                          onChange={(event) => updateBlockImage(block.id, event.target.value)}
                          placeholder={text.imageUrl}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                        />
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          {text.imageUploadHint}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            className="hidden"
                            disabled={uploading || saving || schemaMissing}
                            onChange={(event) => void handleBlockImageSelect(event, block.id)}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || uploading || schemaMissing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              <Save className="w-4 h-4" />
              {saving ? text.saving : text.saveChanges}
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-black mb-4">{text.previewTitle}</h3>

          <div className="relative overflow-hidden rounded-xl min-h-125 border border-gray-200">
            {form.background_image_url ? (
              <img
                src={form.background_image_url}
                alt="About background preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-linear-to-br from-zinc-900 via-gray-700 to-zinc-800" />
            )}

            <div className="absolute inset-0 bg-black/55" />

            <div className="relative z-10 min-h-125 p-6 flex items-center justify-center">
              <div className="w-full max-w-xl text-center bg-white/92 border border-white/30 rounded-2xl px-6 py-8 shadow-xl">
                <h4 className="text-3xl font-bold text-black mb-3">
                  {form.title}
                </h4>
                <p className="text-gray-800 mb-4 leading-relaxed">
                  {form.headline}
                </p>

                <div className="space-y-3 text-left">
                  {form.content_blocks.map((block) => {
                    if (block.type === 'image' && block.image_url) {
                      return (
                        <img
                          key={block.id}
                          src={block.image_url}
                          alt={text.blockImageAlt}
                          className="w-full rounded-lg border border-gray-200"
                        />
                      )
                    }

                    if (block.type === 'text' && block.text) {
                      return (
                        <p
                          key={block.id}
                          className="text-sm text-gray-700 leading-relaxed whitespace-pre-line"
                        >
                          {block.text}
                        </p>
                      )
                    }

                    return null
                  })}
                </div>
              </div>
            </div>

            {!form.background_image_url && (
              <div className="absolute top-3 right-3 bg-white/90 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{text.noBackground}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
