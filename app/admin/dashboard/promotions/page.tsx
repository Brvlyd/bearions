'use client'

import { useEffect, useMemo, useState } from 'react'
import { Gift, Plus, Save, Trash2, Sparkles, Calculator } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { supabase, type ShippingPromotion } from '@/lib/supabase'
import {
  describePromotion,
  describeReward,
  evaluatePromotions,
} from '@/lib/promotions'
import type {
  PromotionConditionType,
  PromotionRewardType,
  PromotionScope,
} from '@/lib/supabase'

// Promotion builder.
//
// The rule model is deliberately narrow — one condition, one reward — so the
// form can be phrased as a sentence ("buy at least 5 items -> free shipping")
// rather than a grid of checkboxes. Anything an admin builds here is evaluated
// by the exact same function the checkout and order APIs run, so the preview at
// the bottom of the form is the real behaviour, not an approximation.

type Message = { type: 'success' | 'error'; text: string }

type PromotionForm = {
  id?: string
  name: string
  name_id: string
  description: string
  description_id: string
  condition_type: PromotionConditionType
  condition_value: string
  reward_type: PromotionRewardType
  reward_value: string
  max_discount: string
  scope: PromotionScope
  stackable: boolean
  priority: string
  is_active: boolean
  starts_at: string
  ends_at: string
  usage_limit: string
}

const EMPTY_FORM: PromotionForm = {
  name: '',
  name_id: '',
  description: '',
  description_id: '',
  condition_type: 'min_items',
  condition_value: '5',
  reward_type: 'free_shipping',
  reward_value: '0',
  max_discount: '',
  scope: 'domestic',
  stackable: false,
  priority: '0',
  is_active: true,
  starts_at: '',
  ends_at: '',
  usage_limit: '',
}

const REWARD_NEEDS_VALUE: PromotionRewardType[] = [
  'shipping_percent',
  'shipping_fixed',
  'order_percent',
  'order_fixed',
]

const REWARD_IS_PERCENT: PromotionRewardType[] = ['shipping_percent', 'order_percent']

// Example text for the two customer-facing name fields. These stay fixed to
// their own language regardless of the admin's UI locale — the English field
// always shows an English example, the Indonesian field an Indonesian one.
const EXAMPLE_NAME_EN = 'Free shipping on 5+ items'
const EXAMPLE_NAME_ID = 'Gratis ongkir untuk 5+ item'

const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)

/** `datetime-local` needs "YYYY-MM-DDTHH:mm" — an ISO string has more than that. */
const toLocalInput = (iso: string | null) => (iso ? iso.slice(0, 16) : '')

export default function AdminPromotionsPage() {
  const { language } = useLanguage()
  const [promotions, setPromotions] = useState<ShippingPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [form, setForm] = useState<PromotionForm>(EMPTY_FORM)

  // Simulator inputs — a sanity check before an admin publishes a rule.
  const [simItems, setSimItems] = useState('5')
  const [simSubtotal, setSimSubtotal] = useState('500000')
  const [simShipping, setSimShipping] = useState('25000')

  const t = (en: string, id: string) => (language === 'en' ? en : id)

  useEffect(() => {
    void loadPromotions()
  }, [])

  const loadPromotions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('shipping_promotions')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        // 42P01 = table does not exist: the migration has not been run yet.
        if (error.code === '42P01') {
          setSchemaMissing(true)
          return
        }
        throw error
      }

      setSchemaMissing(false)
      setPromotions((data || []) as ShippingPromotion[])
    } catch (error) {
      console.error('Error loading promotions:', error)
      setMessage({
        type: 'error',
        text: t('Failed to load promotions.', 'Gagal memuat promo.'),
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setMessage(null)
  }

  const startEdit = (promotion: ShippingPromotion) => {
    setForm({
      id: promotion.id,
      name: promotion.name,
      name_id: promotion.name_id || '',
      description: promotion.description || '',
      description_id: promotion.description_id || '',
      condition_type: promotion.condition_type,
      condition_value: String(promotion.condition_value ?? 0),
      reward_type: promotion.reward_type,
      reward_value: String(promotion.reward_value ?? 0),
      max_discount: promotion.max_discount === null ? '' : String(promotion.max_discount),
      scope: promotion.scope,
      stackable: promotion.stackable,
      priority: String(promotion.priority ?? 0),
      is_active: promotion.is_active,
      starts_at: toLocalInput(promotion.starts_at),
      ends_at: toLocalInput(promotion.ends_at),
      usage_limit: promotion.usage_limit === null ? '' : String(promotion.usage_limit),
    })
    setMessage(null)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMessage({
        type: 'error',
        text: t('Promotion name is required.', 'Nama promo wajib diisi.'),
      })
      return
    }

    const rewardValue = Number(form.reward_value) || 0

    if (REWARD_NEEDS_VALUE.includes(form.reward_type) && rewardValue <= 0) {
      setMessage({
        type: 'error',
        text: t('Enter a discount amount above zero.', 'Isi nilai diskon lebih dari nol.'),
      })
      return
    }

    if (REWARD_IS_PERCENT.includes(form.reward_type) && rewardValue > 100) {
      setMessage({
        type: 'error',
        text: t('A percentage cannot exceed 100.', 'Persentase tidak boleh lebih dari 100.'),
      })
      return
    }

    if (form.starts_at && form.ends_at && new Date(form.starts_at) > new Date(form.ends_at)) {
      setMessage({
        type: 'error',
        text: t('End date must be after the start date.', 'Tanggal selesai harus setelah tanggal mulai.'),
      })
      return
    }

    const payload = {
      name: form.name.trim(),
      name_id: form.name_id.trim() || null,
      description: form.description.trim() || null,
      description_id: form.description_id.trim() || null,
      condition_type: form.condition_type,
      condition_value: form.condition_type === 'always' ? 0 : Number(form.condition_value) || 0,
      reward_type: form.reward_type,
      reward_value: form.reward_type === 'free_shipping' ? 0 : rewardValue,
      max_discount: form.max_discount.trim() === '' ? null : Number(form.max_discount),
      scope: form.scope,
      stackable: form.stackable,
      priority: Number(form.priority) || 0,
      is_active: form.is_active,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      usage_limit: form.usage_limit.trim() === '' ? null : Number(form.usage_limit),
    }

    try {
      setSaving(true)
      setMessage(null)

      const { error } = form.id
        ? await supabase.from('shipping_promotions').update(payload).eq('id', form.id)
        : await supabase.from('shipping_promotions').insert(payload)

      if (error) throw error

      setMessage({ type: 'success', text: t('Promotion saved.', 'Promo tersimpan.') })
      resetForm()
      await loadPromotions()
    } catch (error) {
      console.error('Error saving promotion:', error)
      setMessage({
        type: 'error',
        text: t('Failed to save promotion.', 'Gagal menyimpan promo.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (promotion: ShippingPromotion) => {
    try {
      const { error } = await supabase
        .from('shipping_promotions')
        .update({ is_active: !promotion.is_active })
        .eq('id', promotion.id)

      if (error) throw error
      await loadPromotions()
    } catch (error) {
      console.error('Error toggling promotion:', error)
      setMessage({
        type: 'error',
        text: t('Failed to update promotion.', 'Gagal memperbarui promo.'),
      })
    }
  }

  const handleDelete = async (promotion: ShippingPromotion) => {
    const confirmed = window.confirm(
      t(
        `Delete "${promotion.name}"? Orders that already used it keep their discount.`,
        `Hapus "${promotion.name}"? Pesanan yang sudah memakainya tetap mendapat diskon.`
      )
    )

    if (!confirmed) return

    try {
      const { error } = await supabase.from('shipping_promotions').delete().eq('id', promotion.id)
      if (error) throw error

      if (form.id === promotion.id) resetForm()
      setMessage({ type: 'success', text: t('Promotion deleted.', 'Promo dihapus.') })
      await loadPromotions()
    } catch (error) {
      console.error('Error deleting promotion:', error)
      setMessage({
        type: 'error',
        text: t('Failed to delete promotion.', 'Gagal menghapus promo.'),
      })
    }
  }

  // Runs the form through the real engine, so the preview cannot drift from
  // what a customer would actually get.
  const simulation = useMemo(() => {
    const draft = {
      id: form.id || 'draft',
      name: form.name || 'Draft',
      name_id: form.name_id || null,
      description: null,
      description_id: null,
      reward_type: form.reward_type,
      reward_value: form.reward_type === 'free_shipping' ? 0 : Number(form.reward_value) || 0,
      max_discount: form.max_discount.trim() === '' ? null : Number(form.max_discount),
      condition_type: form.condition_type,
      condition_value: form.condition_type === 'always' ? 0 : Number(form.condition_value) || 0,
      scope: form.scope,
      country_codes: [],
      courier_codes: [],
      stackable: form.stackable,
      priority: Number(form.priority) || 0,
      is_active: true,
      starts_at: null,
      ends_at: null,
      usage_limit: null,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ShippingPromotion

    const shipping = Number(simShipping) || 0
    const subtotal = Number(simSubtotal) || 0

    const outcome = evaluatePromotions([draft], {
      itemCount: Number(simItems) || 0,
      subtotal,
      weightGrams: 1000,
      shippingCost: shipping,
      // The simulator assumes a domestic order unless the rule is intl-only.
      countryCode: form.scope === 'international' ? 'SG' : 'ID',
      courierCode: 'jne',
    })

    return {
      fired: outcome.applied.length > 0,
      shippingAfter: Math.max(0, shipping - outcome.shippingDiscount),
      orderAfter: Math.max(0, subtotal - outcome.orderDiscount),
      shippingDiscount: outcome.shippingDiscount,
      orderDiscount: outcome.orderDiscount,
      sentence: describePromotion(draft, language),
    }
  }, [form, simItems, simSubtotal, simShipping, language])

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
          <Gift className="w-7 h-7" />
          {t('Discounts & Free Shipping', 'Diskon & Gratis Ongkir')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t(
            'Build a rule as a sentence. It applies automatically at checkout — no coupon code needed.',
            'Buat aturan seperti menulis kalimat. Otomatis berlaku di checkout — tanpa kode kupon.'
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

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ---------------------------------------------------------------- */}
        {/* Rule builder                                                      */}
        {/* ---------------------------------------------------------------- */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-black">
                {form.id ? t('Edit Rule', 'Ubah Aturan') : t('New Rule', 'Aturan Baru')}
              </h2>
              {form.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black"
                >
                  <Plus className="w-4 h-4" />
                  {t('Create new instead', 'Buat baru saja')}
                </button>
              )}
            </div>

            {/* The sentence */}
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-black">
                <span className="font-medium">{t('If the customer', 'Jika pelanggan')}</span>

                <select
                  value={form.condition_type}
                  onChange={(e) =>
                    setForm({ ...form, condition_type: e.target.value as PromotionConditionType })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="min_items">{t('buys at least', 'membeli minimal')}</option>
                  <option value="min_subtotal">{t('spends at least', 'belanja minimal')}</option>
                  <option value="min_weight">{t('has a parcel of at least', 'punya paket minimal')}</option>
                  <option value="always">{t('orders anything', 'memesan apa saja')}</option>
                </select>

                {form.condition_type !== 'always' && (
                  <>
                    <input
                      type="number"
                      min={0}
                      value={form.condition_value}
                      onChange={(e) => setForm({ ...form, condition_value: e.target.value })}
                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg bg-white text-black font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <span className="font-medium">
                      {form.condition_type === 'min_items'
                        ? t('items', 'item')
                        : form.condition_type === 'min_subtotal'
                        ? 'IDR'
                        : t('grams', 'gram')}
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-black">
                <span className="font-medium">{t('then give them', 'maka berikan')}</span>

                <select
                  value={form.reward_type}
                  onChange={(e) =>
                    setForm({ ...form, reward_type: e.target.value as PromotionRewardType })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="free_shipping">{t('free shipping', 'gratis ongkir')}</option>
                  <option value="shipping_percent">{t('% off shipping', '% diskon ongkir')}</option>
                  <option value="shipping_fixed">{t('IDR off shipping', 'potongan ongkir (IDR)')}</option>
                  <option value="order_percent">{t('% off the order', '% diskon belanja')}</option>
                  <option value="order_fixed">{t('IDR off the order', 'potongan belanja (IDR)')}</option>
                </select>

                {REWARD_NEEDS_VALUE.includes(form.reward_type) && (
                  <>
                    <input
                      type="number"
                      min={0}
                      value={form.reward_value}
                      onChange={(e) => setForm({ ...form, reward_value: e.target.value })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg bg-white text-black font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <span className="font-medium">
                      {REWARD_IS_PERCENT.includes(form.reward_type) ? '%' : 'IDR'}
                    </span>
                  </>
                )}
              </div>

              {/* A percentage without a ceiling is how a big cart turns into a
                  loss, so offer the cap right where the percentage is set. */}
              {REWARD_IS_PERCENT.includes(form.reward_type) && (
                <div className="flex flex-wrap items-center gap-2 text-black">
                  <span className="font-medium">{t('but no more than', 'tapi maksimal')}</span>
                  <input
                    type="number"
                    min={0}
                    value={form.max_discount}
                    onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                    placeholder={t('no limit', 'tanpa batas')}
                    className="w-40 px-3 py-2 border border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="font-medium">IDR</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-black">
                <span className="font-medium">{t('for orders shipped', 'untuk pengiriman')}</span>
                <select
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value as PromotionScope })}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="all">{t('anywhere', 'ke mana saja')}</option>
                  <option value="domestic">{t('within Indonesia', 'dalam negeri')}</option>
                  <option value="international">{t('abroad', 'luar negeri')}</option>
                </select>
              </div>
            </div>

            {/* Customer-visible naming */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Name shown to customers (English)', 'Nama untuk pelanggan (Inggris)')}
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={EXAMPLE_NAME_EN}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Name shown to customers (Indonesian)', 'Nama untuk pelanggan (Indonesia)')}
                </label>
                <input
                  value={form.name_id}
                  onChange={(e) => setForm({ ...form, name_id: e.target.value })}
                  placeholder={EXAMPLE_NAME_ID}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Scheduling and limits */}
            <details className="mt-5 group">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-black select-none">
                {t('Schedule and limits (optional)', 'Jadwal dan batasan (opsional)')}
              </summary>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('Starts', 'Mulai')}</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('Ends', 'Selesai')}</label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    {t('Max total uses', 'Maks total pemakaian')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                    placeholder={t('unlimited', 'tanpa batas')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    {t('Priority (higher wins ties)', 'Prioritas (makin tinggi makin diutamakan)')}
                  </label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 mt-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.stackable}
                  onChange={(e) => setForm({ ...form, stackable: e.target.checked })}
                  className="w-4 h-4 mt-0.5"
                />
                <span>
                  {t('Can combine with other promotions', 'Bisa digabung dengan promo lain')}
                  <span className="block text-xs text-gray-500">
                    {t(
                      'Off by default: only the single best non-combinable rule applies, so two free-shipping rules never discount the same parcel twice.',
                      'Default mati: hanya satu aturan terbaik yang berlaku, sehingga dua promo gratis ongkir tidak memotong ongkir yang sama dua kali.'
                    )}
                  </span>
                </span>
              </label>
            </details>

            <label className="flex items-center gap-2 mt-5 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              {t('Active — customers can earn this now', 'Aktif — pelanggan bisa mendapatkannya sekarang')}
            </label>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving
                  ? t('Saving...', 'Menyimpan...')
                  : form.id
                  ? t('Update Rule', 'Perbarui Aturan')
                  : t('Create Rule', 'Buat Aturan')}
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                >
                  {t('Cancel', 'Batal')}
                </button>
              )}
            </div>
          </div>

          {/* Simulator */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-black mb-1 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              {t('Try it on a sample cart', 'Coba pada contoh keranjang')}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {t(
                'This runs the same calculation the checkout does.',
                'Ini memakai perhitungan yang sama persis dengan checkout.'
              )}
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('Items', 'Jumlah item')}</label>
                <input
                  type="number"
                  min={0}
                  value={simItems}
                  onChange={(e) => setSimItems(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('Subtotal', 'Subtotal')}</label>
                <input
                  type="number"
                  min={0}
                  value={simSubtotal}
                  onChange={(e) => setSimSubtotal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">{t('Shipping', 'Ongkir')}</label>
                <input
                  type="number"
                  min={0}
                  value={simShipping}
                  onChange={(e) => setSimShipping(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div
              className={`mt-4 rounded-xl border p-4 ${
                simulation.fired
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <p className="text-sm font-medium text-gray-800 mb-2">{simulation.sentence}</p>

              {simulation.fired ? (
                <div className="space-y-1 text-sm">
                  <p className="text-emerald-800 font-semibold inline-flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    {t('Promotion applies', 'Promo berlaku')}
                  </p>
                  <p className="text-gray-700">
                    {t('Shipping', 'Ongkir')}: {formatIDR(Number(simShipping) || 0)} →{' '}
                    <span className="font-semibold text-emerald-700">
                      {simulation.shippingAfter === 0
                        ? t('FREE', 'GRATIS')
                        : formatIDR(simulation.shippingAfter)}
                    </span>
                  </p>
                  {simulation.orderDiscount > 0 && (
                    <p className="text-gray-700">
                      {t('Order', 'Belanja')}: {formatIDR(Number(simSubtotal) || 0)} →{' '}
                      <span className="font-semibold text-emerald-700">
                        {formatIDR(simulation.orderAfter)}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  {t(
                    'This cart does not qualify — the customer pays full price.',
                    'Keranjang ini belum memenuhi syarat — pelanggan bayar penuh.'
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Existing rules                                                    */}
        {/* ---------------------------------------------------------------- */}
        <div className="xl:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-black mb-4">
              {t('Current Rules', 'Aturan Saat Ini')}
            </h2>

            {loading ? (
              <div className="py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
              </div>
            ) : promotions.length === 0 ? (
              <p className="text-sm text-gray-600 py-6 text-center">
                {t('No promotions yet.', 'Belum ada promo.')}
              </p>
            ) : (
              <div className="space-y-3">
                {promotions.map((promotion) => (
                  <div
                    key={promotion.id}
                    className={`rounded-xl border p-4 ${
                      promotion.is_active
                        ? 'border-gray-200 bg-white'
                        : 'border-gray-200 bg-gray-50 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-black truncate">
                          {language === 'en' ? promotion.name : promotion.name_id || promotion.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {describePromotion(promotion, language)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                          promotion.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {promotion.is_active ? t('Active', 'Aktif') : t('Off', 'Nonaktif')}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                      <span>
                        {promotion.scope === 'domestic'
                          ? t('Domestic', 'Dalam negeri')
                          : promotion.scope === 'international'
                          ? t('International', 'Luar negeri')
                          : t('All destinations', 'Semua tujuan')}
                      </span>
                      <span>
                        {t('Used', 'Terpakai')}: {promotion.usage_count}
                        {promotion.usage_limit ? ` / ${promotion.usage_limit}` : ''}
                      </span>
                      {promotion.ends_at && (
                        <span>
                          {t('Until', 'Sampai')}{' '}
                          {new Date(promotion.ends_at).toLocaleDateString('id-ID')}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => startEdit(promotion)}
                        className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                      >
                        {t('Edit', 'Ubah')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(promotion)}
                        className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                      >
                        {promotion.is_active ? t('Turn off', 'Matikan') : t('Turn on', 'Aktifkan')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(promotion)}
                        className="text-xs px-2.5 py-1.5 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        {t('Delete', 'Hapus')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold mb-1">{t('How rules combine', 'Cara aturan digabung')}</p>
            <p>
              {t(
                'When several rules match one cart, every "can combine" rule applies plus the single most valuable of the rest. Discounts never exceed the shipping cost or the subtotal.',
                'Jika beberapa aturan cocok untuk satu keranjang, semua aturan "bisa digabung" berlaku ditambah satu aturan lain yang paling menguntungkan. Diskon tidak akan pernah melebihi ongkir atau subtotal.'
              )}
            </p>
            <p className="mt-2 text-xs text-blue-800">
              {t('Example reward', 'Contoh hadiah')}:{' '}
              {describeReward(
                { reward_type: form.reward_type, reward_value: Number(form.reward_value) || 0, max_discount: null },
                language
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
