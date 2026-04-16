'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Plus, Save, Eye } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { PaymentMethodConfig, supabase } from '@/lib/supabase'
import {
  DEFAULT_PAYMENT_METHODS,
  parsePaymentMethodError,
} from '@/lib/payment-methods'

type Message = {
  type: 'success' | 'error'
  text: string
}

type MethodForm = {
  id?: string
  code: string
  display_name: string
  description: string
  instructions: string
  provider_name: string
  account_name: string
  account_number: string
  requires_proof: boolean
  is_active: boolean
  sort_order: number
}

const DEFAULT_FORM: MethodForm = {
  code: '',
  display_name: '',
  description: '',
  instructions: '',
  provider_name: '',
  account_name: '',
  account_number: '',
  requires_proof: false,
  is_active: true,
  sort_order: 1,
}

export default function AdminPaymentMethodsPage() {
  const { language } = useLanguage()
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [form, setForm] = useState<MethodForm>(DEFAULT_FORM)
  const [previewCode, setPreviewCode] = useState('')

  const text = {
    title: language === 'en' ? 'Payment Methods Manager' : 'Pengelola Metode Pembayaran',
    subtitle:
      language === 'en'
        ? 'Add, remove, and customize checkout payment systems with live preview.'
        : 'Tambah, hapus, dan ubah metode pembayaran checkout dengan live preview.',
    setupRequired: language === 'en' ? 'Setup required' : 'Perlu setup',
    setupHelp:
      language === 'en'
        ? 'Run payment-methods-schema.sql in Supabase SQL Editor, then refresh this page.'
        : 'Jalankan payment-methods-schema.sql di Supabase SQL Editor, lalu refresh halaman ini.',
    code: language === 'en' ? 'Code' : 'Kode',
    displayName: language === 'en' ? 'Display Name' : 'Nama Tampil',
    description: language === 'en' ? 'Description' : 'Deskripsi',
    instructions: language === 'en' ? 'Instructions' : 'Instruksi',
    provider: language === 'en' ? 'Provider/Bank Name' : 'Nama Provider/Bank',
    accountName: language === 'en' ? 'Account Name' : 'Nama Rekening',
    accountNumber: language === 'en' ? 'Account Number' : 'Nomor Rekening',
    sortOrder: language === 'en' ? 'Sort Order' : 'Urutan',
    requiresProof: language === 'en' ? 'Require payment proof' : 'Wajib bukti pembayaran',
    active: language === 'en' ? 'Active in checkout' : 'Aktif di checkout',
    save: language === 'en' ? 'Save Method' : 'Simpan Metode',
    addNew: language === 'en' ? 'Add New Method' : 'Tambah Metode Baru',
    saving: language === 'en' ? 'Saving...' : 'Menyimpan...',
    delete: language === 'en' ? 'Delete' : 'Hapus',
    edit: language === 'en' ? 'Edit' : 'Ubah',
    listTitle: language === 'en' ? 'Current Methods' : 'Metode Saat Ini',
    previewTitle: language === 'en' ? 'Checkout Live Preview' : 'Live Preview Checkout',
    saveSuccess: language === 'en' ? 'Payment method saved.' : 'Metode pembayaran tersimpan.',
    deleteSuccess: language === 'en' ? 'Payment method deleted.' : 'Metode pembayaran dihapus.',
    saveFailed: language === 'en' ? 'Failed to save payment method' : 'Gagal menyimpan metode pembayaran',
    deleteFailed: language === 'en' ? 'Failed to delete payment method' : 'Gagal menghapus metode pembayaran',
    loadFailed: language === 'en' ? 'Failed to load payment methods' : 'Gagal memuat metode pembayaran',
    codeRequired: language === 'en' ? 'Code is required' : 'Kode wajib diisi',
    nameRequired: language === 'en' ? 'Display name is required' : 'Nama tampil wajib diisi',
    noMethods: language === 'en' ? 'No payment methods yet.' : 'Belum ada metode pembayaran.',
    selected: language === 'en' ? 'Selected' : 'Dipilih',
    selectedPreview: language === 'en' ? 'Preview of selected method' : 'Preview metode terpilih',
    statusActive: language === 'en' ? 'Active' : 'Aktif',
    statusInactive: language === 'en' ? 'Inactive' : 'Nonaktif',
    noActiveMethods:
      language === 'en'
        ? 'No active method for checkout. Activate at least one method.'
        : 'Tidak ada metode aktif untuk checkout. Aktifkan minimal satu metode.',
  }

  const loadMethods = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        const parsed = parsePaymentMethodError(error)
        setSchemaMissing(parsed.isMissingTableError)

        if (!parsed.isMissingTableError) {
          setMessage({
            type: 'error',
            text: `${text.loadFailed}: ${parsed.message} (${parsed.code})`,
          })
        }

        setMethods(DEFAULT_PAYMENT_METHODS)
        if (!previewCode && DEFAULT_PAYMENT_METHODS.length > 0) {
          setPreviewCode(DEFAULT_PAYMENT_METHODS[0].code)
        }
        return
      }

      const allMethods = (data || []) as PaymentMethodConfig[]
      const nextMethods = allMethods.length > 0 ? allMethods : DEFAULT_PAYMENT_METHODS

      setSchemaMissing(false)
      setMethods(nextMethods)

      if (!previewCode && nextMethods.length > 0) {
        setPreviewCode(nextMethods[0].code)
      }
    } catch (error) {
      const parsed = parsePaymentMethodError(error)
      setMessage({ type: 'error', text: `${text.loadFailed}: ${parsed.message} (${parsed.code})` })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMethods()
  }, [])

  const resetForm = () => {
    setForm(DEFAULT_FORM)
  }

  const handleEdit = (method: PaymentMethodConfig) => {
    setForm({
      id: method.id,
      code: method.code,
      display_name: method.display_name,
      description: method.description || '',
      instructions: method.instructions || '',
      provider_name: method.provider_name || '',
      account_name: method.account_name || '',
      account_number: method.account_number || '',
      requires_proof: method.requires_proof,
      is_active: method.is_active,
      sort_order: method.sort_order,
    })
  }

  const handleSave = async () => {
    if (schemaMissing) {
      setMessage({ type: 'error', text: text.setupHelp })
      return
    }

    if (!form.code.trim()) {
      setMessage({ type: 'error', text: text.codeRequired })
      return
    }

    if (!form.display_name.trim()) {
      setMessage({ type: 'error', text: text.nameRequired })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      const payload = {
        code: form.code.trim().toLowerCase().replace(/\s+/g, '_'),
        display_name: form.display_name.trim(),
        description: form.description.trim() || null,
        instructions: form.instructions.trim() || null,
        provider_name: form.provider_name.trim() || null,
        account_name: form.account_name.trim() || null,
        account_number: form.account_number.trim() || null,
        requires_proof: form.requires_proof,
        is_active: form.is_active,
        sort_order: Number(form.sort_order || 0),
        updated_at: new Date().toISOString(),
      }

      if (form.id) {
        const { error } = await supabase
          .from('payment_methods')
          .update(payload)
          .eq('id', form.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert(payload)

        if (error) throw error
      }

      setMessage({ type: 'success', text: text.saveSuccess })
      resetForm()
      await loadMethods()
    } catch (error) {
      const parsed = parsePaymentMethodError(error)
      setMessage({ type: 'error', text: `${text.saveFailed}: ${parsed.message} (${parsed.code})` })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (methodId: string) => {
    const confirmed = window.confirm(
      language === 'en' ? 'Delete this payment method?' : 'Hapus metode pembayaran ini?'
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId)

      if (error) throw error

      setMessage({ type: 'success', text: text.deleteSuccess })
      await loadMethods()
    } catch (error) {
      const parsed = parsePaymentMethodError(error)
      setMessage({ type: 'error', text: `${text.deleteFailed}: ${parsed.message} (${parsed.code})` })
    }
  }

  const previewMethods = useMemo(() => {
    const activeMethods = methods.filter((method) => method.is_active)
    if (activeMethods.length > 0) return activeMethods

    if (methods.length > 0) return []
    return DEFAULT_PAYMENT_METHODS
  }, [methods])

  const selectedPreview = previewMethods.find((method) => method.code === previewCode) || previewMethods[0] || null

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
        <h2 className="text-2xl font-bold text-black mb-2">{text.title}</h2>
        <p className="text-gray-600">{text.subtitle}</p>
      </div>

      {schemaMissing && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-1">{text.setupRequired}</h3>
          <p className="text-sm text-yellow-800">{text.setupHelp}</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">{form.id ? text.edit : text.addNew}</h3>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {text.addNew}
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder={text.code}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />
              <input
                value={form.display_name}
                onChange={(event) => setForm((prev) => ({ ...prev, display_name: event.target.value }))}
                placeholder={text.displayName}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />
              <input
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder={text.description}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />
              <textarea
                value={form.instructions}
                onChange={(event) => setForm((prev) => ({ ...prev, instructions: event.target.value }))}
                placeholder={text.instructions}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />
              <input
                value={form.provider_name}
                onChange={(event) => setForm((prev) => ({ ...prev, provider_name: event.target.value }))}
                placeholder={text.provider}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />
              <input
                value={form.account_name}
                onChange={(event) => setForm((prev) => ({ ...prev, account_name: event.target.value }))}
                placeholder={text.accountName}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />
              <input
                value={form.account_number}
                onChange={(event) => setForm((prev) => ({ ...prev, account_number: event.target.value }))}
                placeholder={text.accountNumber}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />
              <input
                type="number"
                value={form.sort_order}
                onChange={(event) => setForm((prev) => ({ ...prev, sort_order: Number(event.target.value) }))}
                placeholder={text.sortOrder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
              />

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.requires_proof}
                  onChange={(event) => setForm((prev) => ({ ...prev, requires_proof: event.target.checked }))}
                />
                {text.requiresProof}
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                {text.active}
              </label>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || schemaMissing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
              >
                <Save className="w-4 h-4" />
                {saving ? text.saving : text.save}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-black mb-4">{text.listTitle}</h3>

            <div className="space-y-3">
              {methods.length === 0 && (
                <p className="text-sm text-gray-500">{text.noMethods}</p>
              )}

              {methods.map((method) => (
                <div key={method.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-black text-sm">{method.display_name}</p>
                      <p className="text-xs text-gray-500">{method.code}</p>
                      <span className={`inline-flex mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        method.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {method.is_active ? text.statusActive : text.statusInactive}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(method)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                      >
                        {text.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(method.id)}
                        className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                      >
                        {text.delete}
                      </button>
                    </div>
                  </div>
                  {method.description && (
                    <p className="text-xs text-gray-600 mt-2">{method.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {text.previewTitle}
          </h3>

          {previewMethods.length === 0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-sm px-3 py-2">
              {text.noActiveMethods}
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-5">
                {previewMethods.map((method) => (
                  <button
                    key={method.code}
                    type="button"
                    onClick={() => setPreviewCode(method.code)}
                    className={`w-full text-left border-2 rounded-lg p-3 transition ${
                      selectedPreview?.code === method.code
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-black">{method.display_name}</p>
                        {method.description && <p className="text-sm text-gray-600 mt-1">{method.description}</p>}
                      </div>
                      {selectedPreview?.code === method.code && (
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-black text-white">
                          {text.selected}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {selectedPreview && (
                <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-black mb-2">{text.selectedPreview}</p>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p><span className="font-medium">{text.displayName}:</span> {selectedPreview.display_name}</p>
                    {selectedPreview.provider_name && (
                      <p><span className="font-medium">{text.provider}:</span> {selectedPreview.provider_name}</p>
                    )}
                    {selectedPreview.account_name && (
                      <p><span className="font-medium">{text.accountName}:</span> {selectedPreview.account_name}</p>
                    )}
                    {selectedPreview.account_number && (
                      <p><span className="font-medium">{text.accountNumber}:</span> {selectedPreview.account_number}</p>
                    )}
                    {selectedPreview.instructions && (
                      <p className="mt-2 whitespace-pre-line">{selectedPreview.instructions}</p>
                    )}
                    <p className="text-xs text-gray-500 pt-1">
                      {selectedPreview.requires_proof
                        ? (language === 'en' ? 'This method requires payment proof upload.' : 'Metode ini mewajibkan upload bukti pembayaran.')
                        : (language === 'en' ? 'This method does not require payment proof.' : 'Metode ini tidak mewajibkan bukti pembayaran.')}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-4 text-xs text-gray-500 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" />
            <span>
              {language === 'en'
                ? 'Preview follows the same style used on checkout payment step.'
                : 'Preview mengikuti gaya yang sama dengan langkah pembayaran di checkout.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
