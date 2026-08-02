'use client'

import { useEffect, useMemo, useState } from 'react'
import { Globe, MapPin, Save, Truck, Zap } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import {
  supabase,
  type ShippingSettings,
  type ShippingZone,
  type ShippingZoneRate,
} from '@/lib/supabase'

// Shipping control panel: where parcels leave from, which engine prices them,
// and the rate card the zone engine uses.
//
// The zone table is the store's fallback — it needs no API key and always
// answers, which is what keeps checkout quoting when the live aggregator is
// unconfigured or down. Editing it here is how an admin tunes prices against
// real courier invoices.

type Message = { type: 'success' | 'error'; text: string }

type RateDraft = Pick<
  ShippingZoneRate,
  'id' | 'first_kg_cost' | 'next_kg_cost' | 'etd_min_days' | 'etd_max_days' | 'is_active'
>

const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)

export default function AdminShippingPage() {
  const { language } = useLanguage()
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

  const t = (en: string, id: string) => (language === 'en' ? en : id)

  useEffect(() => {
    void loadAll()
  }, [])

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
      setMessage({
        type: 'error',
        text: t('Failed to load shipping settings.', 'Gagal memuat pengaturan pengiriman.'),
      })
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

      setMessage({ type: 'success', text: t('Settings saved.', 'Pengaturan tersimpan.') })
    } catch (error) {
      console.error('Error saving shipping settings:', error)
      setMessage({
        type: 'error',
        text: t('Failed to save settings.', 'Gagal menyimpan pengaturan.'),
      })
    } finally {
      setSavingSettings(false)
    }
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
      setMessage({ type: 'success', text: t('Rates updated.', 'Tarif diperbarui.') })
      await loadAll()
    } catch (error) {
      console.error('Error saving rates:', error)
      setMessage({ type: 'error', text: t('Failed to save rates.', 'Gagal menyimpan tarif.') })
    } finally {
      setSavingRates(false)
    }
  }

  const activeZone = zones.find((zone) => zone.id === activeZoneId) || null
  const pendingRateEdits = Object.keys(rateDrafts).length

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-black" />
      </div>
    )
  }

  if (schemaMissing) {
    return (
      <div className="max-w-3xl">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h1 className="text-xl font-bold text-amber-900 mb-2">
            {t('Setup required', 'Perlu setup')}
          </h1>
          <p className="text-amber-800">
            {t(
              'Run db/migrations/shipping-engine-and-promotions.sql in the Supabase SQL Editor, then refresh this page.',
              'Jalankan db/migrations/shipping-engine-and-promotions.sql di Supabase SQL Editor, lalu refresh halaman ini.'
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-black flex items-center gap-2">
          <Truck className="w-7 h-7" />
          {t('Shipping', 'Pengiriman')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t(
            'Origin address, rate engine, and the courier price list used at checkout.',
            'Alamat asal, mesin tarif, dan daftar harga kurir yang dipakai di checkout.'
          )}
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

      {settings && (
        <>
          {/* Rate engine ------------------------------------------------- */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              {t('Rate Engine', 'Mesin Tarif')}
            </h2>

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
                <p className="font-semibold text-black">
                  {t('Zone rate table', 'Tabel tarif zona')}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {t(
                    'Prices from the table below. No API key, no per-request cost, always available.',
                    'Harga dari tabel di bawah. Tanpa API key, tanpa biaya per request, selalu tersedia.'
                  )}
                </p>
              </button>

              <button
                type="button"
                onClick={() => patchSettings({ shipping_provider: 'biteship' })}
                className={`text-left border-2 rounded-xl p-4 transition ${
                  settings.shipping_provider === 'biteship'
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-black">
                  {t('Live courier rates (Biteship)', 'Tarif kurir live (Biteship)')}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {t(
                    'Real-time multi-courier pricing. Needs BITESHIP_API_KEY in the environment; falls back to the zone table if the call fails.',
                    'Harga multi-kurir real-time. Perlu BITESHIP_API_KEY di environment; otomatis kembali ke tabel zona jika gagal.'
                  )}
                </p>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t('Default weight per item (g)', 'Berat default per item (g)')}
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
                  {t(
                    'Used when a product has no weight set.',
                    'Dipakai jika produk belum punya berat.'
                  )}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t('Volumetric divisor', 'Pembagi volumetrik')}
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
                  {t(
                    '6000 for domestic, 5000 for most international couriers.',
                    '6000 untuk domestik, 5000 untuk mayoritas kurir internasional.'
                  )}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t('Handling fee (IDR)', 'Biaya packing (IDR)')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.shipping_handling_fee}
                  onChange={(e) => patchSettings({ shipping_handling_fee: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('Added to every shipping quote.', 'Ditambahkan ke setiap ongkir.')}
                </p>
              </div>
            </div>
          </div>

          {/* Origin ------------------------------------------------------ */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-black mb-1 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {t('Ships From', 'Dikirim Dari')}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {t(
                'Every rate is measured from this address.',
                'Semua ongkir dihitung dari alamat ini.'
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={settings.shipping_origin_label || ''}
                onChange={(e) => patchSettings({ shipping_origin_label: e.target.value })}
                placeholder={t('Warehouse name', 'Nama gudang')}
                className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={settings.shipping_origin_address || ''}
                onChange={(e) => patchSettings({ shipping_origin_address: e.target.value })}
                placeholder={t('Street address', 'Alamat jalan')}
                className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={settings.shipping_origin_city || ''}
                onChange={(e) => patchSettings({ shipping_origin_city: e.target.value })}
                placeholder={t('City', 'Kota')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={settings.shipping_origin_province || ''}
                onChange={(e) => patchSettings({ shipping_origin_province: e.target.value })}
                placeholder={t('Province', 'Provinsi')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={settings.shipping_origin_postal_code || ''}
                onChange={(e) => patchSettings({ shipping_origin_postal_code: e.target.value })}
                placeholder={t('Postal code', 'Kode pos')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              />
              <input
                value={settings.shipping_origin_area_id || ''}
                onChange={(e) => patchSettings({ shipping_origin_area_id: e.target.value })}
                placeholder={t('Biteship area ID (optional)', 'Area ID Biteship (opsional)')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* International ----------------------------------------------- */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('International Shipping', 'Pengiriman Internasional')}
            </h2>

            <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                checked={settings.shipping_international_enabled}
                onChange={(e) =>
                  patchSettings({ shipping_international_enabled: e.target.checked })
                }
                className="w-4 h-4"
              />
              {t('Accept orders shipping outside Indonesia', 'Terima pesanan ke luar Indonesia')}
            </label>

            <div className="grid grid-cols-1 gap-3 mt-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t('Customs notice (English)', 'Catatan bea cukai (Inggris)')}
                </label>
                <textarea
                  rows={2}
                  value={settings.shipping_customs_note || ''}
                  onChange={(e) => patchSettings({ shipping_customs_note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t('Customs notice (Indonesian)', 'Catatan bea cukai (Indonesia)')}
                </label>
                <textarea
                  rows={2}
                  value={settings.shipping_customs_note_id || ''}
                  onChange={(e) => patchSettings({ shipping_customs_note_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Duties surprise is the single biggest source of refused
                international parcels — this note is shown at checkout. */}
            <p className="text-xs text-gray-500 mt-2">
              {t(
                'Shown on the checkout page for every international destination.',
                'Ditampilkan di halaman checkout untuk semua tujuan luar negeri.'
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savingSettings ? t('Saving...', 'Menyimpan...') : t('Save Settings', 'Simpan Pengaturan')}
          </button>
        </>
      )}

      {/* Rate card ------------------------------------------------------- */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-black mb-1">
          {t('Zone Rate Card', 'Daftar Tarif Zona')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t(
            'Cost = first kg + (billable kg - 1) x next kg. Tune these against real courier invoices.',
            'Biaya = kg pertama + (kg tertagih - 1) x kg berikutnya. Sesuaikan dengan invoice kurir asli.'
          )}
        </p>

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
              {language === 'en' ? zone.name : zone.name_id || zone.name}
            </button>
          ))}
        </div>

        {activeZone && (
          <p className="text-xs text-gray-500 mb-3">
            {activeZone.kind === 'domestic'
              ? (activeZone.province_names || []).join(', ') ||
                t('Catch-all for unmatched provinces', 'Cadangan untuk provinsi tak terdaftar')
              : (activeZone.country_codes || []).join(', ') ||
                t('Catch-all for unmatched countries', 'Cadangan untuk negara tak terdaftar')}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">{t('Service', 'Layanan')}</th>
                <th className="py-2 px-3 font-medium">{t('First kg', 'Kg pertama')}</th>
                <th className="py-2 px-3 font-medium">{t('Next kg', 'Kg berikutnya')}</th>
                <th className="py-2 px-3 font-medium">{t('ETD (days)', 'Estimasi (hari)')}</th>
                <th className="py-2 px-3 font-medium">{t('Active', 'Aktif')}</th>
                <th className="py-2 pl-3 font-medium">{t('2 kg example', 'Contoh 2 kg')}</th>
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
          <p className="text-sm text-gray-600 py-4">
            {t('No services configured for this zone.', 'Belum ada layanan untuk zona ini.')}
          </p>
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
              {savingRates
                ? t('Saving...', 'Menyimpan...')
                : t(`Save ${pendingRateEdits} change(s)`, `Simpan ${pendingRateEdits} perubahan`)}
            </button>
            <button
              type="button"
              onClick={() => setRateDrafts({})}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
            >
              {t('Discard', 'Batalkan')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
