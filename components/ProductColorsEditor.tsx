'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowDown, ArrowUp, ImageOff, Palette, Plus, Trash2, Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'
import { getErrorMessage } from '@/lib/errors'
import { PRODUCT_COLOR_OPTIONS, productColorLabel } from '@/lib/product-options'

export type ColorDraft = {
  /** Local-only identity. Rows are re-created on every save, so ids are not kept. */
  key: string
  name: string
  name_id: string
  hex_code: string
  image_url: string
}

interface ProductColorsEditorProps {
  value: ColorDraft[]
  onChange: (colors: ColorDraft[]) => void
  /** The product's uploaded photos, offered as the quickest source for a swatch image. */
  galleryImages: string[]
}

const MAX_COLOR_IMAGE_SIZE = 5 * 1024 * 1024

/** Suggested starting colours, so a new product is one click from a usable list. */
const STARTER_HEX: Record<string, string> = {
  Black: '#111111',
  White: '#f5f5f5',
  Navy: '#1e3a5f',
  Gray: '#9ca3af',
  Beige: '#e3d5c0',
}

export const makeColorDraft = (overrides: Partial<ColorDraft> = {}): ColorDraft => ({
  key: `color-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  name_id: '',
  hex_code: '#111111',
  image_url: '',
  ...overrides,
})

/**
 * Reports which rows cannot be saved. Duplicates matter beyond tidiness: the
 * colour name is what gets written onto the cart and the order, so two rows
 * called "Black" make an order line ambiguous — and the table has a unique
 * index that would reject the save anyway.
 */
export function findColorDraftProblems(colors: ColorDraft[]) {
  const seen = new Map<string, number>()
  const duplicateKeys = new Set<string>()
  let hasBlankName = false

  colors.forEach((color) => {
    const name = color.name.trim().toLowerCase()
    if (!name) {
      hasBlankName = true
      return
    }

    const count = seen.get(name) ?? 0
    seen.set(name, count + 1)
    if (count > 0) duplicateKeys.add(color.key)
  })

  // Mark every member of a duplicate group, not just the later ones.
  const duplicatedNames = new Set(
    Array.from(seen.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name)
  )
  colors.forEach((color) => {
    if (duplicatedNames.has(color.name.trim().toLowerCase())) duplicateKeys.add(color.key)
  })

  return { duplicateKeys, hasBlankName, hasProblem: duplicateKeys.size > 0 || hasBlankName }
}

export default function ProductColorsEditor({
  value,
  onChange,
  galleryImages,
}: ProductColorsEditorProps) {
  const { tr, language } = useLanguage()
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetKey = useRef<string | null>(null)

  const { duplicateKeys, hasBlankName } = findColorDraftProblems(value)

  const updateRow = (key: string, patch: Partial<ColorDraft>) => {
    onChange(value.map((color) => (color.key === key ? { ...color, ...patch } : color)))
  }

  const removeRow = (key: string) => {
    onChange(value.filter((color) => color.key !== key))
  }

  const moveRow = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= value.length) return

    const next = [...value]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const addRow = () => {
    onChange([...value, makeColorDraft()])
  }

  const addStarterColors = () => {
    const existing = new Set(value.map((color) => color.name.trim().toLowerCase()))
    const additions = PRODUCT_COLOR_OPTIONS.filter(
      (name) => !existing.has(name.toLowerCase())
    ).map((name) =>
      makeColorDraft({
        name,
        name_id: productColorLabel(name, 'id'),
        hex_code: STARTER_HEX[name] ?? '#111111',
      })
    )

    if (additions.length > 0) onChange([...value, ...additions])
  }

  const openFilePicker = (key: string) => {
    uploadTargetKey.current = key
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const key = uploadTargetKey.current
    event.target.value = ''
    if (!file || !key) return

    if (!file.type.startsWith('image/')) {
      setError(tr('Please upload an image file', 'Silakan unggah file gambar'))
      return
    }

    if (file.size > MAX_COLOR_IMAGE_SIZE) {
      setError(tr('Image size should be less than 5MB', 'Ukuran gambar harus kurang dari 5MB'))
      return
    }

    try {
      setError('')
      setUploadingKey(key)

      const fileExt = file.name.split('.').pop() || 'jpg'
      const filePath = `products/colors/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { cacheControl: '3600', contentType: file.type || undefined })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('product-images').getPublicUrl(filePath)

      updateRow(key, { image_url: publicUrl })
    } catch (uploadError) {
      console.error('Color image upload failed:', uploadError)
      setError(
        tr('Failed to upload image', 'Gagal mengunggah gambar') + ': ' + getErrorMessage(uploadError)
      )
    } finally {
      setUploadingKey(null)
      uploadTargetKey.current = null
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h3 className="text-base font-semibold text-black flex items-center gap-2">
          <Palette className="w-4 h-4" />
          {tr('Colors', 'Warna')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {value.length === 0 && (
            <button
              type="button"
              onClick={addStarterColors}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-50"
            >
              <Palette className="w-4 h-4" />
              {tr('Use default colors', 'Pakai warna bawaan')}
            </button>
          )}
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            {tr('Add color', 'Tambah warna')}
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {tr(
          'Each color can carry a photo of this product in that color. On the product page, tapping a color selects it and opens that photo. Leave this empty to keep the shared default color list.',
          'Setiap warna bisa punya foto produk ini dalam warna tersebut. Di halaman produk, saat warna diklik, warna itu terpilih dan fotonya muncul. Kosongkan untuk memakai daftar warna bawaan.'
        )}
      </p>

      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center">
          <p className="text-sm text-gray-500">
            {tr(
              'No colors yet — this product will show the default colors (Black, White, Navy, Gray, Beige) with no photo.',
              'Belum ada warna — produk ini akan menampilkan warna bawaan (Black, White, Navy, Gray, Beige) tanpa foto.'
            )}
          </p>
        </div>
      ) : (
        // Long lists scroll inside the card so a product with a dozen colours
        // does not push the Save button off the screen.
        <div className="space-y-3 max-h-[30rem] overflow-y-auto overscroll-contain pr-1">
          {value.map((color, index) => {
            const isDuplicate = duplicateKeys.has(color.key)
            const isBlank = !color.name.trim()

            return (
              <div
                key={color.key}
                className={`rounded-lg border p-3 ${
                  isDuplicate || isBlank ? 'border-red-300 bg-red-50/40' : 'border-gray-200 bg-gray-50/60'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {tr('Color', 'Warna')} {index + 1}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveRow(index, -1)}
                      disabled={index === 0}
                      className="p-2 rounded-lg text-gray-500 transition hover:bg-gray-200 hover:text-black disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label={tr('Move up', 'Naikkan')}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(index, 1)}
                      disabled={index === value.length - 1}
                      className="p-2 rounded-lg text-gray-500 transition hover:bg-gray-200 hover:text-black disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label={tr('Move down', 'Turunkan')}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(color.key)}
                      className="p-2 rounded-lg text-red-500 transition hover:bg-red-100"
                      aria-label={tr('Remove color', 'Hapus warna')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {tr('Name (English) *', 'Nama (Inggris) *')}
                    </label>
                    <input
                      type="text"
                      value={color.name}
                      onChange={(e) => updateRow(color.key, { name: e.target.value })}
                      placeholder={tr('e.g. Maroon', 'contoh: Maroon')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {tr('Name (Indonesian)', 'Nama (Indonesia)')}
                    </label>
                    <input
                      type="text"
                      value={color.name_id}
                      onChange={(e) => updateRow(color.key, { name_id: e.target.value })}
                      placeholder={tr('e.g. Merah Marun', 'contoh: Merah Marun')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    {tr('Swatch', 'Warna tombol')}
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(color.hex_code) ? color.hex_code : '#111111'}
                      onChange={(e) => updateRow(color.key, { hex_code: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded border border-gray-300 bg-white p-1"
                      aria-label={tr('Swatch color', 'Warna tombol')}
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-300 bg-white">
                      {color.image_url ? (
                        <Image
                          src={color.image_url}
                          alt={color.name || tr('Color photo', 'Foto warna')}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <ImageOff className="h-5 w-5" />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openFilePicker(color.key)}
                      disabled={uploadingKey === color.key}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingKey === color.key
                        ? tr('Uploading...', 'Mengunggah...')
                        : tr('Upload photo', 'Unggah foto')}
                    </button>

                    {color.image_url && (
                      <button
                        type="button"
                        onClick={() => updateRow(color.key, { image_url: '' })}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-black"
                      >
                        <X className="h-4 w-4" />
                        {tr('Clear', 'Hapus')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Reusing a photo already uploaded for this product is the
                    common case, so it needs no second trip through storage. */}
                {galleryImages.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-600 mb-1.5">
                      {tr('Or pick from product images', 'Atau pilih dari gambar produk')}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {galleryImages.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => updateRow(color.key, { image_url: url })}
                          className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                            color.image_url === url
                              ? 'border-black'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          aria-label={tr('Use this image', 'Pakai gambar ini')}
                        >
                          <Image src={url} alt="" fill unoptimized className="object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isDuplicate && (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {tr(
                      'Another color already uses this name. Names must be unique.',
                      'Nama ini sudah dipakai warna lain. Nama warna harus unik.'
                    )}
                  </p>
                )}
                {isBlank && (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {tr('English name is required.', 'Nama Inggris wajib diisi.')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {hasBlankName && value.length > 0 && (
        <p className="mt-3 text-sm text-red-600">
          {tr(
            'Fill in every color name before saving.',
            'Isi semua nama warna sebelum menyimpan.'
          )}
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        {tr(
          `Language shown to shoppers: ${language === 'id' ? 'Indonesian names are used when set' : 'English names are used unless an Indonesian name is set'}.`,
          'Nama Indonesia dipakai untuk pembeli berbahasa Indonesia; kalau kosong, nama Inggris yang dipakai.'
        )}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
      />
    </div>
  )
}
