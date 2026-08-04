'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  Search,
  Truck,
  XCircle,
  Zap,
} from 'lucide-react'
import {
  supabase,
  type ShippingSettings,
  type ShippingZone,
  type ShippingZoneRate,
} from '@/lib/supabase'
import { SHIPPING_ENABLED } from '@/lib/store-config'
import LoadingSpinner from '@/components/LoadingSpinner'

// Shipping control panel: where parcels leave from, which engine prices them,
// and the rate card the zone engine uses.
//
// Written in plain Indonesian only, no language toggle: the shop owner operates
// this page, not the developers, and courier jargon here costs real money when
// misread.
//
// The zone table is the store's fallback — it needs no API key and always
// answers, which is what keeps checkout quoting when Biteship is unconfigured,
// unreachable, or out of balance.

type Message = { type: 'success' | 'error'; text: string }

type RateDraft = Pick<
  ShippingZoneRate,
  'id' | 'first_kg_cost' | 'next_kg_cost' | 'etd_min_days' | 'etd_max_days' | 'is_active'
>

type BiteshipStatus = {
  configured: boolean
  healthy: boolean
  reason: 'unconfigured' | 'unauthorized' | 'insufficient_balance' | 'error' | null
  message: string
  courierCount: number
}

type AreaHit = {
  id: string
  name: string
  province: string
  city: string
  district: string
  postalCode: string
}

const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)

/** Turns the API's failure reason into something the shop owner can act on. */
const explainStatus = (
  status: BiteshipStatus
): { tone: 'ok' | 'warn' | 'bad'; title: string; detail: string } => {
  if (!status.configured) {
    return {
      tone: 'bad',
      title: 'Biteship belum terpasang',
      detail:
        'Kunci API Biteship belum diisi di server. Hubungi developer untuk memasangnya. Selama belum terpasang, ongkir memakai Tabel Tarif Sendiri di bawah.',
    }
  }

  if (status.healthy) {
    return {
      tone: 'ok',
      title: 'Biteship aktif dan siap dipakai',
      detail: `Terhubung ke ${status.courierCount} perusahaan kurir. Ongkir dan lacak paket otomatis berjalan normal.`,
    }
  }

  if (status.reason === 'insufficient_balance') {
    return {
      tone: 'warn',
      title: 'Saldo Biteship habis',
      detail:
        'Kunci API sudah benar, tapi saldo akun Biteship Rp 0. Selama saldo kosong, cek ongkir otomatis dan lacak paket tidak bisa jalan, dan ongkir diambil dari Tabel Tarif Sendiri di bawah. Silakan isi saldo di dashboard Biteship (menu Balance / Top Up), lalu klik Cek Ulang.',
    }
  }

  if (status.reason === 'unauthorized') {
    return {
      tone: 'bad',
      title: 'Kunci API Biteship ditolak',
      detail:
        'Biteship menolak kunci API yang terpasang. Kemungkinan kuncinya salah ketik, sudah dihapus, atau diganti. Hubungi developer untuk memperbarui.',
    }
  }

  return {
    tone: 'bad',
    title: 'Biteship sedang tidak bisa dihubungi',
    detail: `Koneksi ke Biteship gagal: ${status.message}. Ongkir sementara memakai Tabel Tarif Sendiri. Coba Cek Ulang beberapa saat lagi.`,
  }
}

const STATUS_STYLES = {
  ok: { box: 'border-emerald-300 bg-emerald-50', text: 'text-emerald-900', body: 'text-emerald-800' },
  warn: { box: 'border-amber-300 bg-amber-50', text: 'text-amber-900', body: 'text-amber-800' },
  bad: { box: 'border-red-300 bg-red-50', text: 'text-red-900', body: 'text-red-800' },
} as const

export default function AdminShippingPage() {
  const [settings, setSettings] = useState<ShippingSettings | null>(null)
  const [zones, setZones] = useState<ShippingZone[]>([])
  const [rates, setRates] = useState<ShippingZoneRate[]>([])
  const [rateDrafts, setRateDrafts] = useState<Record<string, RateDraft>>({})
  const [activeZoneId, setActiveZoneId] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingRates, setSavingRates] = useState(false)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  const [status, setStatus] = useState<BiteshipStatus | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)

  const [areaQuery, setAreaQuery] = useState('')
  const [areaHits, setAreaHits] = useState<AreaHit[]>([])
  const [searchingArea, setSearchingArea] = useState(false)
  const [areaSearched, setAreaSearched] = useState(false)

  useEffect(() => {
    void loadAll()
    void refreshStatus()
  }, [])

  const authHeaders = async (): Promise<Record<string, string> | null> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : null
  }

  const refreshStatus = async () => {
    try {
      setCheckingStatus(true)

      const headers = await authHeaders()
      if (!headers) return

      const response = await fetch('/api/admin/shipping/status', { headers })
      if (!response.ok) return

      setStatus((await response.json()) as BiteshipStatus)
    } catch (error) {
      console.error('Error checking Biteship status:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  const loadAll = async () => {
    try {
      setLoading(true)

      const [settingsResult, zonesResult, ratesResult] = await Promise.all([
        supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('shipping_zones').select('*').order('sort_order', { ascending: true }),
        supabase.from('shipping_zone_rates').select('*').order('sort_order', { ascending: true }),
      ])

      // 42P01 = table missing: the migration has not been run yet.
      if (zonesResult.error?.code === '42P01' || ratesResult.error?.code === '42P01') {
        setSchemaMissing(true)
        return
      }

      if (settingsResult.data) {
        const row = settingsResult.data as Record<string, unknown>

        if (!('shipping_provider' in row)) {
          setSchemaMissing(true)
          return
        }

        setSettings(row as unknown as ShippingSettings)
      }

      const zoneRows = (zonesResult.data || []) as ShippingZone[]
      const rateRows = (ratesResult.data || []) as ShippingZoneRate[]

      setZones(zoneRows)
      setRates(rateRows)
      setSchemaMissing(false)
      setActiveZoneId((previous) => previous || zoneRows[0]?.id || '')
    } catch (error) {
      console.error('Error loading shipping settings:', error)
      setMessage({ type: 'error', text: 'Gagal memuat pengaturan pengiriman.' })
    } finally {
      setLoading(false)
    }
  }

  const patchSettings = (patch: Partial<ShippingSettings>) => {
    setSettings((previous) => (previous ? { ...previous, ...patch } : previous))
  }

  const handleSaveSettings = async () => {
    if (!settings) return

    try {
      setSavingSettings(true)
      setMessage(null)

      const { error } = await supabase
        .from('site_settings')
        .update({
          shipping_origin_label: settings.shipping_origin_label,
          shipping_origin_address: settings.shipping_origin_address,
          shipping_origin_city: settings.shipping_origin_city,
          shipping_origin_province: settings.shipping_origin_province,
          shipping_origin_postal_code: settings.shipping_origin_postal_code,
          shipping_origin_area_id: settings.shipping_origin_area_id || null,
          shipping_origin_contact_name: settings.shipping_origin_contact_name,
          shipping_origin_contact_phone: settings.shipping_origin_contact_phone,
          shipping_origin_collection_method: settings.shipping_origin_collection_method || 'pickup',
          shipping_provider: settings.shipping_provider,
          shipping_default_weight_grams: Number(settings.shipping_default_weight_grams) || 500,
          shipping_volumetric_divisor: Number(settings.shipping_volumetric_divisor) || 6000,
          shipping_handling_fee: Number(settings.shipping_handling_fee) || 0,
          shipping_international_enabled: settings.shipping_international_enabled,
          shipping_customs_note: settings.shipping_customs_note,
          shipping_customs_note_id: settings.shipping_customs_note_id,
        })
        .eq('id', 1)

      if (error) throw error

      setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan.' })
    } catch (error) {
      console.error('Error saving shipping settings:', error)
      setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan.' })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSearchArea = async () => {
    const query = areaQuery.trim()
    if (query.length < 3) return

    try {
      setSearchingArea(true)
      setAreaSearched(true)

      const headers = await authHeaders()
      if (!headers) return

      const response = await fetch(`/api/shipping/areas?q=${encodeURIComponent(query)}`, {
        headers,
      })

      if (!response.ok) {
        setAreaHits([])
        return
      }

      const payload = (await response.json()) as { areas?: AreaHit[] }
      setAreaHits(payload.areas || [])
    } catch (error) {
      console.error('Error searching areas:', error)
      setAreaHits([])
    } finally {
      setSearchingArea(false)
    }
  }

  /** Picking a district fills the origin fields so they cannot drift apart. */
  const applyArea = (area: AreaHit) => {
    patchSettings({
      shipping_origin_area_id: area.id,
      shipping_origin_city: area.city || settings?.shipping_origin_city || '',
      shipping_origin_province: area.province || settings?.shipping_origin_province || '',
      shipping_origin_postal_code: area.postalCode || settings?.shipping_origin_postal_code || '',
    })

    setAreaHits([])
    setAreaQuery('')
    setAreaSearched(false)
    setMessage({
      type: 'success',
      text: 'Lokasi gudang terisi. Jangan lupa klik Simpan Pengaturan di bawah.',
    })
  }

  const zoneRates = useMemo(
    () => rates.filter((rate) => rate.zone_id === activeZoneId),
    [rates, activeZoneId]
  )

  const draftFor = (rate: ShippingZoneRate): RateDraft =>
    rateDrafts[rate.id] || {
      id: rate.id,
      first_kg_cost: rate.first_kg_cost,
      next_kg_cost: rate.next_kg_cost,
      etd_min_days: rate.etd_min_days,
      etd_max_days: rate.etd_max_days,
      is_active: rate.is_active,
    }

  const patchRate = (rate: ShippingZoneRate, patch: Partial<RateDraft>) => {
    setRateDrafts((previous) => ({
      ...previous,
      [rate.id]: { ...draftFor(rate), ...patch },
    }))
  }

  const handleSaveRates = async () => {
    const drafts = Object.values(rateDrafts)
    if (drafts.length === 0) return

    try {
      setSavingRates(true)
      setMessage(null)

      // One statement per row: the edited set is small and Supabase has no
      // partial-column bulk update that respects RLS as cleanly.
      for (const draft of drafts) {
        const { error } = await supabase
          .from('shipping_zone_rates')
          .update({
            first_kg_cost: Number(draft.first_kg_cost) || 0,
            next_kg_cost: Number(draft.next_kg_cost) || 0,
            etd_min_days: Number(draft.etd_min_days) || 1,
            etd_max_days: Number(draft.etd_max_days) || 1,
            is_active: draft.is_active,
          })
          .eq('id', draft.id)

        if (error) throw error
      }

      setRateDrafts({})
      setMessage({ type: 'success', text: 'Tarif berhasil diperbarui.' })
      await loadAll()
    } catch (error) {
      console.error('Error saving rates:', error)
      setMessage({ type: 'error', text: 'Gagal menyimpan tarif.' })
    } finally {
      setSavingRates(false)
    }
  }

  const activeZone = zones.find((zone) => zone.id === activeZoneId) || null
  const pendingRateEdits = Object.keys(rateDrafts).length

  if (loading) {
    return <LoadingSpinner />
  }

  if (schemaMissing) {
    return (
      <div className="max-w-3xl">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h1 className="text-xl font-bold text-amber-900 mb-2">Perlu disiapkan dulu</h1>
          <p className="text-amber-800">
            Tabel pengiriman belum ada di database, jadi halaman ini belum bisa dipakai. Minta
            developer menjalankan berkas db/migrations/shipping-engine-and-promotions.sql di
            Supabase, lalu muat ulang halaman ini.
          </p>
        </div>
      </div>
    )
  }

  const usingBiteship = settings?.shipping_provider === 'biteship'
  // Locked out while the account cannot actually quote, so nobody flips the
  // toggle on stage and finds out live it silently falls back to the zone
  // table. Already-selected 'biteship' is left alone -- this only blocks new
  // clicks, it does not revert an existing choice.
  const biteshipSelectable = usingBiteship || status?.healthy === true
  const statusInfo = status ? explainStatus(status) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-black flex items-center gap-2">
          <Truck className="w-7 h-7" />
          Pengiriman
        </h1>
        <p className="text-gray-600 mt-1">
          Atur dari mana barang dikirim, bagaimana ongkir dihitung, dan berapa tarif tiap kurir.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-red-300 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Ongkir masih dimatikan di lib/store-config.ts — tanpa catatan ini admin
          bisa lama mengutak-atik tarif yang belum dipakai sama sekali. */}
      {!SHIPPING_ENABLED && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Ongkir sedang dimatikan untuk pembeli</p>
          <p className="mt-1">
            Pembeli tidak melihat pilihan kurir dan tidak ditagih ongkir saat checkout, jadi semua
            pesanan baru tersimpan dengan ongkir Rp 0. Pengaturan di halaman ini tetap tersimpan dan
            akan langsung dipakai begitu ongkir dinyalakan lagi oleh developer.
          </p>
        </div>
      )}

      {/* Biteship connection ---------------------------------------------- */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-black">Status Koneksi Kurir Otomatis</h2>
            <p className="text-sm text-gray-600 mt-1">
              Biteship adalah layanan yang menghitung ongkir dan melacak paket secara otomatis dari
              belasan perusahaan kurir sekaligus.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshStatus}
            disabled={checkingStatus}
            className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
            {checkingStatus ? 'Mengecek...' : 'Cek Ulang'}
          </button>
        </div>

        {checkingStatus && !statusInfo && (
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Sedang mengecek koneksi ke Biteship...
          </p>
        )}

        {statusInfo && (
          <div className={`rounded-xl border p-4 ${STATUS_STYLES[statusInfo.tone].box}`}>
            <p
              className={`font-semibold flex items-center gap-2 ${
                STATUS_STYLES[statusInfo.tone].text
              }`}
            >
              {statusInfo.tone === 'ok' && <CheckCircle2 className="w-5 h-5" />}
              {statusInfo.tone === 'warn' && <AlertTriangle className="w-5 h-5" />}
              {statusInfo.tone === 'bad' && <XCircle className="w-5 h-5" />}
              {statusInfo.title}
            </p>
            <p className={`text-sm mt-1.5 ${STATUS_STYLES[statusInfo.tone].body}`}>
              {statusInfo.detail}
            </p>
          </div>
        )}
      </div>

      {settings && (
        <>
          {/* Rate engine ------------------------------------------------- */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-black mb-1 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Cara Menghitung Ongkir
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Pilih salah satu. Kalau ragu, pilih yang pertama.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => patchSettings({ shipping_provider: 'zone' })}
                className={`text-left border-2 rounded-xl p-4 transition ${
                  settings.shipping_provider === 'zone'
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-black">Tabel Tarif Sendiri</p>
                <p className="text-sm text-gray-600 mt-1">
                  Ongkir diambil dari daftar tarif yang Anda isi sendiri di bagian bawah halaman
                  ini. Gratis, selalu jalan, tapi harus Anda perbarui manual kalau kurir menaikkan
                  tarif.
                </p>
              </button>

              <button
                type="button"
                onClick={() => patchSettings({ shipping_provider: 'biteship' })}
                disabled={!biteshipSelectable}
                className={`text-left border-2 rounded-xl p-4 transition ${
                  settings.shipping_provider === 'biteship'
                    ? 'border-black bg-gray-50'
                    : biteshipSelectable
                      ? 'border-gray-200 hover:border-gray-300'
                      : 'border-gray-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <p className="font-semibold text-black">Tarif Kurir Otomatis (Biteship)</p>
                <p className="text-sm text-gray-600 mt-1">
                  Ongkir diambil langsung dari kurir sesuai tarif terbaru, jadi tidak perlu
                  diperbarui manual. Butuh saldo Biteship. Kalau sewaktu-waktu gagal, sistem otomatis
                  memakai Tabel Tarif Sendiri supaya pembeli tetap bisa checkout.
                </p>
                {!biteshipSelectable && (
                  <p className="text-xs text-amber-700 mt-2 font-medium">
                    Belum bisa dipilih sampai saldo Biteship terisi (lihat kotak status di atas).
                  </p>
                )}
              </button>
            </div>

            {/* Silently falling back would leave the owner wondering why live
                prices never appear, so say it out loud right where it is chosen. */}
            {usingBiteship && status && !status.healthy && (
              <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-sm text-amber-800">
                  <strong>Perhatian:</strong> Anda memilih Tarif Kurir Otomatis, tapi koneksi
                  Biteship sedang bermasalah (lihat kotak status di atas). Untuk sementara ongkir
                  tetap diambil dari Tabel Tarif Sendiri, jadi pastikan tarif di bawah masih wajar.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Berat standar per barang (gram)
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings.shipping_default_weight_grams}
                  onChange={(e) =>
                    patchSettings({ shipping_default_weight_grams: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dipakai kalau berat produk belum diisi. Contoh: 500 berarti setengah kilo.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Angka pembagi ukuran paket
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings.shipping_volumetric_divisor}
                  onChange={(e) =>
                    patchSettings({ shipping_volumetric_divisor: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kurir menagih paket besar tapi ringan berdasarkan ukuran. Biarkan 6000 untuk
                  kirim dalam negeri. Jangan diubah kalau tidak diminta kurir.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Biaya packing (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.shipping_handling_fee}
                  onChange={(e) => patchSettings({ shipping_handling_fee: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tambahan biaya bubble wrap, kardus, dll. Ditambahkan ke setiap ongkir. Isi 0 kalau
                  tidak dipungut.
                </p>
              </div>
            </div>
          </div>

          {/* Origin ------------------------------------------------------ */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-black mb-1 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Alamat Gudang (Barang Dikirim Dari Sini)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Semua ongkir dihitung dari alamat ini. Kalau alamat salah, ongkir yang dibayar pembeli
              ikut salah.
            </p>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
              <p className="text-sm font-medium text-gray-800 mb-1">
                Cara cepat: cari kecamatan gudang Anda
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Ketik nama kecamatan dan kota, lalu pilih dari hasil pencarian. Kolom kota,
                provinsi, dan kode pos akan terisi otomatis, dan ongkir jadi lebih akurat.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={areaQuery}
                  onChange={(e) => setAreaQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleSearchArea()
                    }
                  }}
                  placeholder="Contoh: Coblong Bandung"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={handleSearchArea}
                  disabled={searchingArea || areaQuery.trim().length < 3}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {searchingArea ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Cari
                </button>
              </div>

              {areaHits.length > 0 && (
                <ul className="mt-3 border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {areaHits.map((area) => (
                    <li key={area.id}>
                      <button
                        type="button"
                        onClick={() => applyArea(area)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
                      >
                        {area.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {areaSearched && !searchingArea && areaHits.length === 0 && (
                <p className="text-xs text-gray-600 mt-3">
                  Tidak ada hasil. Coba tulis nama kecamatan diikuti nama kota, contoh: Coblong
                  Bandung. Kalau tetap kosong, isi manual di kolom bawah.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama gudang</label>
                <input
                  value={settings.shipping_origin_label || ''}
                  onChange={(e) => patchSettings({ shipping_origin_label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alamat lengkap (nama jalan, nomor)
                </label>
                <input
                  value={settings.shipping_origin_address || ''}
                  onChange={(e) => patchSettings({ shipping_origin_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
                <input
                  value={settings.shipping_origin_city || ''}
                  onChange={(e) => patchSettings({ shipping_origin_city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
                <input
                  value={settings.shipping_origin_province || ''}
                  onChange={(e) => patchSettings({ shipping_origin_province: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode pos</label>
                <input
                  value={settings.shipping_origin_postal_code || ''}
                  onChange={(e) => patchSettings({ shipping_origin_postal_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kode kecamatan Biteship
                </label>
                <input
                  value={settings.shipping_origin_area_id || ''}
                  onChange={(e) => patchSettings({ shipping_origin_area_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Terisi otomatis lewat pencarian di atas. Tidak perlu diisi manual.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama pengirim (untuk Biteship)
                </label>
                <input
                  value={settings.shipping_origin_contact_name || ''}
                  onChange={(e) => patchSettings({ shipping_origin_contact_name: e.target.value })}
                  placeholder="Nama yang dilihat kurir & penerima"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telepon pengirim (untuk Biteship)
                </label>
                <input
                  value={settings.shipping_origin_contact_phone || ''}
                  onChange={(e) => patchSettings({ shipping_origin_contact_phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500 mb-2">
                  Wajib diisi supaya tombol &quot;Buat Pengiriman &amp; Cetak Resi&quot; di halaman order bisa dipakai.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paket dijemput atau diantar sendiri?</label>
                <div className="flex gap-4 text-sm text-gray-800">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={(settings.shipping_origin_collection_method || 'pickup') === 'pickup'}
                      onChange={() => patchSettings({ shipping_origin_collection_method: 'pickup' })}
                    />
                    Dijemput kurir
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={settings.shipping_origin_collection_method === 'drop_off'}
                      onChange={() => patchSettings({ shipping_origin_collection_method: 'drop_off' })}
                    />
                    Diantar sendiri ke agen kurir
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* International ----------------------------------------------- */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-black mb-1 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Kirim ke Luar Negeri
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Aktifkan kalau Anda mau menerima pesanan dari pembeli di luar Indonesia.
            </p>

            <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                checked={settings.shipping_international_enabled}
                onChange={(e) =>
                  patchSettings({ shipping_international_enabled: e.target.checked })
                }
                className="w-4 h-4"
              />
              Terima pesanan ke luar Indonesia
            </label>

            <div className="grid grid-cols-1 gap-3 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keterangan bea cukai (versi Indonesia)
                </label>
                <textarea
                  rows={2}
                  value={settings.shipping_customs_note_id || ''}
                  onChange={(e) => patchSettings({ shipping_customs_note_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keterangan bea cukai (versi Inggris)
                </label>
                <textarea
                  rows={2}
                  value={settings.shipping_customs_note || ''}
                  onChange={(e) => patchSettings({ shipping_customs_note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Duties surprise is the single biggest source of refused
                international parcels — this note is shown at checkout. */}
            <p className="text-xs text-gray-500 mt-2">
              Tulisan ini muncul di halaman checkout untuk semua pesanan ke luar negeri. Gunanya
              memberi tahu pembeli bahwa pajak impor dibayar sendiri ke kurir saat paket sampai,
              supaya paket tidak ditolak.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </>
      )}

      {/* Rate card ------------------------------------------------------- */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-black mb-1">Daftar Tarif Sendiri</h2>
        <p className="text-sm text-gray-600 mb-1">
          Ongkir dihitung: <strong>tarif kilo pertama + (jumlah kilo - 1) x tarif kilo
          berikutnya</strong>. Contoh: paket 3 kg dengan kilo pertama Rp 10.000 dan kilo berikutnya
          Rp 5.000 menjadi Rp 20.000.
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Daftar ini selalu dipakai sebagai cadangan, walaupun Anda memilih Tarif Kurir Otomatis.
          Sebaiknya sesuaikan angkanya dengan struk kurir asli minimal beberapa bulan sekali.
        </p>

        <p className="text-sm font-medium text-gray-700 mb-2">Pilih wilayah tujuan:</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {zones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => setActiveZoneId(zone.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                zone.id === activeZoneId
                  ? 'border-black bg-black text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {zone.name_id || zone.name}
            </button>
          ))}
        </div>

        {activeZone && (
          <p className="text-xs text-gray-500 mb-3">
            {activeZone.kind === 'domestic'
              ? (activeZone.province_names || []).join(', ') ||
                'Dipakai untuk provinsi yang tidak masuk wilayah mana pun di atas'
              : (activeZone.country_codes || []).join(', ') ||
                'Dipakai untuk negara yang tidak masuk wilayah mana pun di atas'}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">Kurir &amp; layanan</th>
                <th className="py-2 px-3 font-medium">Tarif kilo pertama</th>
                <th className="py-2 px-3 font-medium">Tarif kilo berikutnya</th>
                <th className="py-2 px-3 font-medium">Perkiraan sampai (hari)</th>
                <th className="py-2 px-3 font-medium">Ditampilkan</th>
                <th className="py-2 pl-3 font-medium">Contoh paket 2 kg</th>
              </tr>
            </thead>
            <tbody>
              {zoneRates.map((rate) => {
                const draft = draftFor(rate)
                const twoKg = Number(draft.first_kg_cost) + Number(draft.next_kg_cost)

                return (
                  <tr key={rate.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3">
                      <p className="font-medium text-black">{rate.courier_name}</p>
                      <p className="text-xs text-gray-500">{rate.service_name}</p>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min={0}
                        value={draft.first_kg_cost}
                        onChange={(e) => patchRate(rate, { first_kg_cost: Number(e.target.value) })}
                        className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min={0}
                        value={draft.next_kg_cost}
                        onChange={(e) => patchRate(rate, { next_kg_cost: Number(e.target.value) })}
                        className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={draft.etd_min_days}
                          onChange={(e) => patchRate(rate, { etd_min_days: Number(e.target.value) })}
                          className="w-14 px-2 py-1.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <span className="text-gray-400">–</span>
                        <input
                          type="number"
                          min={1}
                          value={draft.etd_max_days}
                          onChange={(e) => patchRate(rate, { etd_max_days: Number(e.target.value) })}
                          className="w-14 px-2 py-1.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={draft.is_active}
                        onChange={(e) => patchRate(rate, { is_active: e.target.checked })}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="py-2 pl-3 text-gray-600 whitespace-nowrap">{formatIDR(twoKg)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {zoneRates.length === 0 && (
          <p className="text-sm text-gray-600 py-4">Belum ada layanan kurir untuk wilayah ini.</p>
        )}

        {pendingRateEdits > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSaveRates}
              disabled={savingRates}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingRates ? 'Menyimpan...' : `Simpan ${pendingRateEdits} perubahan`}
            </button>
            <button
              type="button"
              onClick={() => setRateDrafts({})}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
            >
              Batalkan perubahan
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
