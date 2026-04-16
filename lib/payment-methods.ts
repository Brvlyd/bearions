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
