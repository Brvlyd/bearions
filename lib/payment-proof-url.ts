import { useEffect, useState } from 'react'
import { paymentService } from './payments'

// The payment-proofs bucket is private, so `payments.payment_proof_url` is no
// longer a directly viewable link — it's resolved into a short-lived signed
// URL on demand through paymentService.getPaymentProofSignedUrl(). See
// app/api/payment-proofs/signed-url/route.ts for why.

type Resolved = { paymentId: string; url: string }

/**
 * Resolves a payment's proof into a viewable URL. `hasProof` gates the fetch
 * so callers can pass it straight from `!!payment?.payment_proof_url` without
 * an extra guard.
 */
export function usePaymentProofUrl(paymentId: string | undefined, hasProof: boolean) {
  const [resolved, setResolved] = useState<Resolved | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!paymentId || !hasProof) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const signedUrl = await paymentService.getPaymentProofSignedUrl(paymentId)
        if (!cancelled) setResolved({ paymentId, url: signedUrl })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load payment proof')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [paymentId, hasProof])

  // Derived rather than reset via setState: avoids showing a stale URL from a
  // previous paymentId while the new one is still loading.
  const url = paymentId && hasProof && resolved?.paymentId === paymentId ? resolved.url : null

  return { url, loading, error }
}
