'use client'

import { useEffect, useState } from 'react'
import { Upload, Save, Globe, Trash2, RotateCcw } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import {
  DEFAULT_SITE_SETTINGS,
  loadSiteSettings,
  parseSiteSettingsError,
  resolveFaviconLink,
} from '@/lib/site-settings'

type Message = {
  type: 'success' | 'error'
  text: string
}

type SiteSettingsFormState = {
  site_title: string
  site_description: string
  favicon_url: string | null
}

// Placeholder domain shown in the browser-tab mockup; not user-facing copy.
const PREVIEW_DOMAIN = 'bearions.example.com'

const MAX_FAVICON_SIZE = 1024 * 1024
const ALLOWED_FAVICON_TYPES = [
  'image/png',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/svg+xml',
  'image/webp',
  'image/jpeg',
  'image/jpg',
]

export default function AdminSiteSettingsPage() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [form, setForm] = useState<SiteSettingsFormState>({
    site_title: DEFAULT_SITE_SETTINGS.site_title,
    site_description: DEFAULT_SITE_SETTINGS.site_description,
    favicon_url: DEFAULT_SITE_SETTINGS.favicon_url,
  })

  const text = {
    pageTitle: language === 'en' ? 'Site Settings' : 'Pengaturan Situs',
    pageSubtitle:
      language === 'en'
        ? 'Change the browser tab name and icon shown to every visitor.'
        : 'Ubah nama dan ikon tab browser yang dilihat semua pengunjung.',
    setupRequired: language === 'en' ? 'Setup required' : 'Perlu setup',
    setupHelp:
      language === 'en'
        ? 'Run site-settings-schema.sql in Supabase SQL Editor, then refresh this page.'
        : 'Jalankan site-settings-schema.sql di Supabase SQL Editor, lalu refresh halaman ini.',
    tabName: language === 'en' ? 'Tab Name' : 'Nama Tab',
    tabNameHint:
      language === 'en'
        ? 'Shown in the browser tab and in search results.'
        : 'Ditampilkan di tab browser dan pada hasil pencarian.',
    tabNamePlaceholder: DEFAULT_SITE_SETTINGS.site_title,
    description: language === 'en' ? 'Site Description' : 'Deskripsi Situs',
    descriptionHint:
      language === 'en'
        ? 'Used as the meta description when the site is shared or indexed.'
        : 'Dipakai sebagai meta description saat situs dibagikan atau diindeks.',
    tabIcon: language === 'en' ? 'Tab Icon (Favicon)' : 'Ikon Tab (Favicon)',
    faviconUrl: language === 'en' ? 'Icon URL' : 'URL Ikon',
    chooseIcon: language === 'en' ? 'Upload icon' : 'Unggah ikon',
    uploadTip:
      language === 'en'
        ? 'Square PNG, ICO, SVG or WebP. Recommended 512 x 512, max 1MB.'
        : 'PNG, ICO, SVG atau WebP persegi. Rekomendasi 512 x 512, maks 1MB.',
    usingDefaultIcon:
      language === 'en'
        ? 'No custom icon set — the default /favicon.ico is used.'
        : 'Belum ada ikon kustom — /favicon.ico bawaan yang dipakai.',
    resetIcon: language === 'en' ? 'Use default icon' : 'Pakai ikon bawaan',
    removeIcon: language === 'en' ? 'Remove icon' : 'Hapus ikon',
    iconTypeError:
      language === 'en'
        ? 'Please select a valid icon file (PNG, ICO, SVG, WebP)'
        : 'Pilih file ikon yang valid (PNG, ICO, SVG, WebP)',
    iconSizeError:
      language === 'en' ? 'Icon must be smaller than 1MB' : 'Ukuran ikon harus kurang dari 1MB',
    uploadFailed: language === 'en' ? 'Failed to upload icon' : 'Gagal mengunggah ikon',
    titleRequired: language === 'en' ? 'Tab name cannot be empty' : 'Nama tab tidak boleh kosong',
    saveChanges: language === 'en' ? 'Save Changes' : 'Simpan Perubahan',
    saving: language === 'en' ? 'Saving...' : 'Menyimpan...',
    uploadingLabel: language === 'en' ? 'Uploading...' : 'Mengunggah...',
    saveSuccess:
      language === 'en'
        ? 'Site settings updated successfully!'
        : 'Pengaturan situs berhasil diperbarui!',
    saveFailed:
      language === 'en' ? 'Failed to save site settings' : 'Gagal menyimpan pengaturan situs',
    loadFailed: language === 'en' ? 'Failed to load site settings' : 'Gagal memuat pengaturan situs',
    previewTitle: language === 'en' ? 'Browser Tab Preview' : 'Preview Tab Browser',
    previewHint:
      language === 'en'
        ? 'Open tabs refresh automatically after saving.'
        : 'Tab yang terbuka akan menyesuaikan otomatis setelah disimpan.',
    untitled: language === 'en' ? 'Untitled' : 'Tanpa Judul',
  }

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const result = await loadSiteSettings()

      setSchemaMissing(result.tableMissing)
      setForm({
        site_title: result.data.site_title,
        site_description: result.data.site_description,
        favicon_url: result.data.favicon_url,
      })

      if (result.error && !result.tableMissing) {
        setMessage({
          type: 'error',
          text: `${text.loadFailed}: ${result.error.message} (${result.error.code})`,
        })
      }

      setLoading(false)
    }

    run()
  }, [])

  const updateField = (field: keyof SiteSettingsFormState, value: string | null) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFaviconSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Some browsers report .ico as an empty type, so fall back to the extension.
    const isIcoByName = file.name.toLowerCase().endsWith('.ico')
    if (!ALLOWED_FAVICON_TYPES.includes(file.type) && !isIcoByName) {
      setMessage({ type: 'error', text: text.iconTypeError })
      event.target.value = ''
      return
    }

    if (file.size > MAX_FAVICON_SIZE) {
      setMessage({ type: 'error', text: text.iconSizeError })
      event.target.value = ''
      return
    }

    try {
      setUploading(true)
      setMessage(null)

      const fileExt = file.name.split('.').pop() || 'png'
      const filePath = `site/favicon-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { contentType: file.type || undefined })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      updateField('favicon_url', publicUrlData.publicUrl)
    } catch (error) {
      const parsed = parseSiteSettingsError(error)
      setMessage({ type: 'error', text: `${text.uploadFailed}: ${parsed.message} (${parsed.code})` })
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleSave = async () => {
    if (schemaMissing) {
      setMessage({ type: 'error', text: text.setupHelp })
      return
    }

    const trimmedTitle = form.site_title.trim()
    if (!trimmedTitle) {
      setMessage({ type: 'error', text: text.titleRequired })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      const { data: authData } = await supabase.auth.getUser()
      const { error } = await supabase.from('site_settings').upsert({
        id: 1,
        site_title: trimmedTitle,
        site_description: form.site_description.trim(),
        favicon_url: form.favicon_url?.trim() || null,
        updated_at: new Date().toISOString(),
        updated_by: authData.user?.id || null,
      })

      if (error) throw error

      setMessage({ type: 'success', text: text.saveSuccess })
    } catch (error) {
      const parsed = parseSiteSettingsError(error)
      if (parsed.isMissingTableError) {
        setSchemaMissing(true)
        setMessage({ type: 'error', text: text.setupHelp })
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

  const previewFavicon = resolveFaviconLink(form.favicon_url)

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
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-black mb-2">{text.tabName}</label>
              <input
                type="text"
                value={form.site_title}
                onChange={(event) => updateField('site_title', event.target.value)}
                placeholder={text.tabNamePlaceholder}
                maxLength={120}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />
              <p className="text-xs text-gray-500 mt-2">{text.tabNameHint}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">{text.description}</label>
              <textarea
                value={form.site_description}
                onChange={(event) => updateField('site_description', event.target.value)}
                rows={3}
                maxLength={300}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />
              <p className="text-xs text-gray-500 mt-2">{text.descriptionHint}</p>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <label className="block text-sm font-medium text-black mb-2">{text.tabIcon}</label>

              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewFavicon.href}
                    alt={language === 'en' ? 'Favicon preview' : 'Pratinjau favicon'}
                    className="w-10 h-10 object-contain"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? text.uploadingLabel : text.chooseIcon}
                    <input
                      type="file"
                      accept=".ico,image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/webp,image/jpeg"
                      className="hidden"
                      disabled={uploading || saving || schemaMissing}
                      onChange={handleFaviconSelect}
                    />
                  </label>

                  {form.favicon_url ? (
                    <button
                      type="button"
                      onClick={() => updateField('favicon_url', null)}
                      disabled={uploading || saving}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {text.removeIcon}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-2 text-xs text-gray-500">
                      <RotateCcw className="w-3.5 h-3.5" />
                      {text.resetIcon}
                    </span>
                  )}
                </div>
              </div>

              <input
                type="text"
                value={form.favicon_url || ''}
                onChange={(event) => updateField('favicon_url', event.target.value)}
                placeholder={text.faviconUrl}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />
              <p className="text-xs text-gray-500 mt-2">{text.uploadTip}</p>
              {!form.favicon_url && (
                <p className="text-xs text-gray-500 mt-1">{text.usingDefaultIcon}</p>
              )}
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

          <div className="rounded-xl border border-gray-200 bg-gray-100 p-4">
            <div className="flex items-end gap-1">
              <div className="flex items-center gap-2 max-w-xs bg-white rounded-t-lg border border-b-0 border-gray-200 px-3 py-2 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewFavicon.href}
                  alt={language === 'en' ? 'Favicon preview' : 'Pratinjau favicon'}
                  className="w-4 h-4 shrink-0 object-contain"
                />
                <span className="text-xs text-gray-800 truncate">
                  {form.site_title.trim() || text.untitled}
                </span>
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded-t-lg border border-b-0 border-gray-200" />
            </div>

            <div className="bg-white border border-gray-200 rounded-b-lg rounded-tr-lg p-4">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 mb-4">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 truncate">{PREVIEW_DOMAIN}</span>
              </div>
              <p className="text-sm font-semibold text-black truncate">
                {form.site_title.trim() || text.untitled}
              </p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{form.site_description}</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">{text.previewHint}</p>
        </div>
      </div>
    </div>
  )
}
