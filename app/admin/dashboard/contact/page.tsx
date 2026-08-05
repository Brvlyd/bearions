'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Save,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  DEFAULT_CONTACT_CONTENT,
  loadContactContent,
  toWhatsAppLink,
  type ContactContent,
} from '@/lib/contact-content'

// Halaman Kontak CMS.
//
// Ditulis dalam Bahasa Indonesia saja, tanpa tombol ganti bahasa: yang memakai
// halaman ini pemilik toko, bukan developer. Isi yang dilihat pembeli tetap
// punya dua kolom (Inggris + Indonesia) karena tokonya dwibahasa — kolom
// Inggris kosong akan otomatis memakai teks Indonesianya, dan sebaliknya.

type Message = { type: 'success' | 'error'; text: string }

const isMissingColumnError = (error: unknown) => {
  const err = (error || {}) as { code?: string; message?: string; details?: string; hint?: string }
  const combined = `${err.message || ''} ${err.details || ''} ${err.hint || ''}`.toLowerCase()

  return (
    err.code === '42703' ||
    err.code === 'PGRST204' ||
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    (combined.includes('contact_') &&
      (combined.includes('does not exist') || combined.includes('schema cache')))
  )
}

export default function AdminContactPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [form, setForm] = useState<ContactContent>(DEFAULT_CONTACT_CONTENT)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const result = await loadContactContent()

      setForm(result.data)

      if (result.error) {
        if (isMissingColumnError(result.error)) {
          setSchemaMissing(true)
        } else {
          setMessage({ type: 'error', text: 'Gagal memuat isi halaman kontak. Coba refresh halaman.' })
        }
      }

      setLoading(false)
    }

    run()
  }, [])

  const update = (field: keyof ContactContent, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.email.trim()) {
      setMessage({ type: 'error', text: 'Email wajib diisi — itu satu-satunya cara pembeli membalas kalau form dimatikan.' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('site_settings')
        .update({
          contact_heading: form.heading.trim() || null,
          contact_heading_id: form.heading_id.trim() || null,
          contact_subheading: form.subheading.trim() || null,
          contact_subheading_id: form.subheading_id.trim() || null,
          contact_address: form.address.trim() || null,
          contact_phone: form.phone.trim() || null,
          contact_email: form.email.trim() || null,
          contact_whatsapp: form.whatsapp.trim() || null,
          contact_maps_url: form.maps_url.trim() || null,
          contact_instagram_url: form.instagram_url.trim() || null,
          contact_tiktok_url: form.tiktok_url.trim() || null,
          contact_hours_weekday: form.hours_weekday.trim() || null,
          contact_hours_weekday_id: form.hours_weekday_id.trim() || null,
          contact_hours_weekend: form.hours_weekend.trim() || null,
          contact_hours_weekend_id: form.hours_weekend_id.trim() || null,
          contact_note: form.note.trim() || null,
          contact_note_id: form.note_id.trim() || null,
          contact_form_enabled: form.form_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)

      if (error) throw error

      setSchemaMissing(false)
      setMessage({ type: 'success', text: 'Tersimpan. Halaman Kontak di toko langsung ikut berubah.' })
    } catch (error) {
      console.error('Failed to save contact content:', error)

      if (isMissingColumnError(error)) {
        setSchemaMissing(true)
        setMessage({ type: 'error', text: 'Kolom kontak belum ada di database. Jalankan dulu SQL-nya (lihat kotak kuning di atas).' })
      } else {
        setMessage({ type: 'error', text: 'Gagal menyimpan. Coba lagi sebentar.' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingSpinner label="Memuat isi halaman kontak..." />
  }

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black'
  const labelClass = 'block text-sm font-medium text-black mb-1.5'
  const hintClass = 'text-xs text-gray-500 mt-1'

  const whatsappPreview = toWhatsAppLink(form.whatsapp)

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-black flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Halaman Kontak
        </h1>
        <p className="text-gray-600 mt-1">
          Semua yang tampil di halaman <span className="font-medium text-black">Hubungi Kami</span> diatur dari sini.
          Alamat, telepon, dan email juga dipakai mesin pencari untuk menampilkan info toko.
        </p>
        <Link
          href="/contact"
          target="_blank"
          className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-black underline underline-offset-4 hover:text-gray-600"
        >
          Lihat halamannya
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {schemaMissing && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Database belum disiapkan
          </p>
          <p className="text-sm text-amber-800 mt-1">
            Buka Supabase → SQL Editor, jalankan isi file{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5">db/migrations/add-contact-page-content.sql</code>,
            lalu refresh halaman ini. Sebelum itu, tombol Simpan belum bisa menyimpan apa pun.
          </p>
        </div>
      )}

      {message && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Judul halaman */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-black mb-1">Judul Halaman</h2>
        <p className="text-sm text-gray-600 mb-4">
          Tulisan besar paling atas di halaman kontak.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Judul (Indonesia)</label>
            <input
              type="text"
              value={form.heading_id}
              onChange={(e) => update('heading_id', e.target.value)}
              placeholder="Hubungi Kami"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Judul (Inggris)</label>
            <input
              type="text"
              value={form.heading}
              onChange={(e) => update('heading', e.target.value)}
              placeholder="Contact Us"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Kalimat pembuka (Indonesia)</label>
            <input
              type="text"
              value={form.subheading_id}
              onChange={(e) => update('subheading_id', e.target.value)}
              placeholder="Kami ingin mendengar dari Anda"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Kalimat pembuka (Inggris)</label>
            <input
              type="text"
              value={form.subheading}
              onChange={(e) => update('subheading', e.target.value)}
              placeholder="We'd love to hear from you"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Info kontak */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-black mb-1">Info Kontak</h2>
        <p className="text-sm text-gray-600 mb-4">
          Ditampilkan di kartu kanan halaman kontak. Kolom yang dikosongkan tidak akan muncul sama sekali.
        </p>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> Email
              </span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="hello@bearion.com"
              className={inputClass}
            />
            <p className={hintClass}>Wajib diisi. Ini alamat yang dilihat pembeli untuk membalas langsung.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-4 h-4" /> Nomor telepon
                </span>
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+62 812 3456 7890"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4" /> Nomor WhatsApp
                </span>
              </label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => update('whatsapp', e.target.value)}
                placeholder="08123456789"
                className={inputClass}
              />
              <p className={hintClass}>
                {whatsappPreview
                  ? `Tombol WhatsApp akan membuka: ${whatsappPreview}`
                  : 'Kosongkan kalau tidak mau ada tombol WhatsApp. Boleh ditulis 08…, 62…, atau +62…'}
              </p>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Alamat toko
              </span>
            </label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Jl. Banjarsari No.39, Tembalang, Semarang"
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>Link Google Maps</label>
            <input
              type="url"
              value={form.maps_url}
              onChange={(e) => update('maps_url', e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className={inputClass}
            />
            <p className={hintClass}>
              Kalau diisi, muncul tombol “Buka di Maps” di bawah alamat. Ambil dari Google Maps → Bagikan → Salin link.
            </p>
          </div>
        </div>
      </section>

      {/* Jam operasional */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-black mb-1 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Jam Operasional
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Tulis apa adanya, misalnya “Senin - Jumat: 09:00 - 18:00”. Kosongkan dua-duanya kalau tidak mau ditampilkan.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Hari kerja (Indonesia)</label>
            <input
              type="text"
              value={form.hours_weekday_id}
              onChange={(e) => update('hours_weekday_id', e.target.value)}
              placeholder="Senin - Jumat: 09:00 - 18:00"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Hari kerja (Inggris)</label>
            <input
              type="text"
              value={form.hours_weekday}
              onChange={(e) => update('hours_weekday', e.target.value)}
              placeholder="Monday - Friday: 9:00 AM - 6:00 PM"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Akhir pekan (Indonesia)</label>
            <input
              type="text"
              value={form.hours_weekend_id}
              onChange={(e) => update('hours_weekend_id', e.target.value)}
              placeholder="Sabtu - Minggu: 10:00 - 16:00"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Akhir pekan (Inggris)</label>
            <input
              type="text"
              value={form.hours_weekend}
              onChange={(e) => update('hours_weekend', e.target.value)}
              placeholder="Saturday - Sunday: 10:00 AM - 4:00 PM"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Media sosial */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-black mb-1">Media Sosial</h2>
        <p className="text-sm text-gray-600 mb-4">
          Muncul sebagai tombol kecil di kartu info kontak. Kosongkan yang tidak dipakai.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              <span className="inline-flex items-center gap-1.5">
                <Instagram className="w-4 h-4" /> Instagram
              </span>
            </label>
            <input
              type="url"
              value={form.instagram_url}
              onChange={(e) => update('instagram_url', e.target.value)}
              placeholder="https://instagram.com/bearion"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              <span className="inline-flex items-center gap-1.5">
                <Music2 className="w-4 h-4" /> TikTok
              </span>
            </label>
            <input
              type="url"
              value={form.tiktok_url}
              onChange={(e) => update('tiktok_url', e.target.value)}
              placeholder="https://tiktok.com/@bearion"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Form pesan */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-black mb-1">Form Pesan</h2>
        <p className="text-sm text-gray-600 mb-4">
          Form tempat pembeli menulis pesan. Pesan yang masuk dikirim ke email toko di atas.
        </p>

        <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={form.form_enabled}
            onChange={(e) => update('form_enabled', e.target.checked)}
            className="mt-1 h-4 w-4 accent-black"
          />
          <span>
            <span className="block font-medium text-black">Tampilkan form pesan</span>
            <span className="block text-sm text-gray-600">
              Kalau dimatikan, pembeli hanya melihat email, telepon, dan WhatsApp — tidak ada kotak isian.
              Pakai ini kalau pesan yang masuk tidak sempat dibalas.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={labelClass}>Catatan di bawah form (Indonesia)</label>
            <input
              type="text"
              value={form.note_id}
              onChange={(e) => update('note_id', e.target.value)}
              placeholder="Biasanya dibalas dalam 1x24 jam."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Catatan di bawah form (Inggris)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => update('note', e.target.value)}
              placeholder="We usually reply within one business day."
              className={inputClass}
            />
          </div>
        </div>
        <p className={hintClass}>
          Opsional. Berguna untuk mengatur harapan pembeli supaya tidak menunggu balasan seharian.
        </p>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-black px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-gray-800 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  )
}
