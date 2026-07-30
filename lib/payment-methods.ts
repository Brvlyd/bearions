import { PaymentMethodConfig, supabase } from '@/lib/supabase'

type SupabaseErrorLike = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'default-bank-transfer',
    code: 'bank_transfer',
    display_name: 'Manual Bank Transfer',
    description: 'Transfer manually and upload payment proof for verification.',
    instructions: 'Transfer sesuai total pembayaran lalu upload bukti pembayaran.',
    provider_name: 'Bank Mandiri',
    account_name: 'BENEDICTUS RIVOLLY A',
    account_number: '1360037247548',
    requires_proof: true,
    is_active: true,
    sort_order: 1,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: 'default-qris',
    code: 'qris',
    display_name: 'QRIS (QR Code Indonesian Standard)',
    description: 'Bayar dengan memindai QRIS menggunakan aplikasi perbankan atau dompet digital.',
    instructions: 'Buka aplikasi pembayaran Anda, pilih fitur scan QR, lalu scan kode QR yang tampil di layar.',
    provider_name: 'QRIS',
    account_name: null,
    account_number: null,
    requires_proof: false,
    is_active: true,
    sort_order: 2,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
  {
    id: 'default-paypal',
    code: 'paypal',
    display_name: 'PayPal',
    description: 'Pay securely with PayPal. Amount is converted from IDR to USD at checkout.',
    instructions: 'Klik tombol PayPal di bawah untuk menyelesaikan pembayaran melalui akun PayPal Anda.',
    provider_name: 'PayPal',
    account_name: null,
    account_number: null,
    requires_proof: false,
    is_active: true,
    sort_order: 3,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
]

export const parsePaymentMethodError = (error: unknown, unknownErrorText = 'Unknown error') => {
  const err = (error || {}) as SupabaseErrorLike
  const message = err.message || unknownErrorText
  const details = err.details || ''
  const hint = err.hint || ''
  const code = err.code || 'UNKNOWN'
  const combined = `${message} ${details} ${hint}`.toLowerCase()

  const isMissingTableError =
    code === '42P01' ||
    code === 'PGRST205' ||
    (combined.includes('payment_methods') &&
      (combined.includes('does not exist') ||
        combined.includes('schema cache') ||
        combined.includes('could not find the table')))

  return {
    message,
    details,
    hint,
    code,
    isMissingTableError,
  }
}

export const loadActivePaymentMethods = async () => {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    const parsedError = parsePaymentMethodError(error)
    return {
      methods: DEFAULT_PAYMENT_METHODS,
      error: parsedError,
      tableMissing: parsedError.isMissingTableError,
    }
  }

  const methods = (data || []) as PaymentMethodConfig[]
  // Ensure any DEFAULT_PAYMENT_METHODS not present in DB are included as fallback (e.g., QRIS)
  const existingCodes = new Set(methods.map((m) => m.code))
  for (const def of DEFAULT_PAYMENT_METHODS) {
    if (!existingCodes.has(def.code) && def.is_active) {
      methods.push(def)
    }
  }
  // Sort by sort_order after merging
  methods.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  if (methods.length === 0) {
    return {
      methods: DEFAULT_PAYMENT_METHODS,
      error: null,
      tableMissing: false,
    }
  }

  return {
    methods,
    error: null,
    tableMissing: false,
  }
}
