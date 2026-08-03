'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'

type PayPalButtonsInstance = {
  render: (selector: string) => Promise<void>
  close?: () => Promise<void>
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => PayPalButtonsInstance
    }
  }
}

let sdkLoadPromise: Promise<void> | null = null

function loadPayPalSdk(clientId: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.paypal) return Promise.resolve()
  if (sdkLoadPromise) return sdkLoadPromise

  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      // Drop the failed script and the cached promise, otherwise one flaky
      // network moment would keep PayPal broken until a full page reload.
      script.remove()
      sdkLoadPromise = null
      reject(new Error('Failed to load PayPal SDK'))
    }
    document.body.appendChild(script)
  })

  return sdkLoadPromise
}

type Props = {
  orderNumber: string
  onSuccess: () => void
  onError?: (message: string) => void
}

export default function PayPalCheckoutButton({ orderNumber, onSuccess, onError }: Props) {
  const { tr } = useLanguage()
  const rawId = useId()
  const containerId = `paypal-button-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const containerRef = useRef<HTMLDivElement>(null)
  // Build-time constant, so "not configured" is knowable on the first render
  // and does not need an effect to discover.
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    clientId ? 'loading' : 'error'
  )
  // Stored as a kind rather than a translated string so the message re-renders
  // in the current language instead of freezing at the moment it failed.
  const [errorKind, setErrorKind] = useState<'sdk' | 'payment' | null>(null)

  const describeError = (kind: 'sdk' | 'payment') =>
    kind === 'sdk'
      ? tr(
          'Failed to load PayPal. Please refresh and try again.',
          'Gagal memuat PayPal. Silakan refresh dan coba lagi.'
        )
      : tr('PayPal payment failed. Please try again.', 'Pembayaran PayPal gagal. Silakan coba lagi.')

  const shownError = errorKind
    ? describeError(errorKind)
    : !clientId
      ? tr('PayPal is not configured.', 'PayPal belum dikonfigurasi.')
      : ''

  // The effect below must not re-run when these change identity: `tr` is rebuilt
  // on every language-provider render, and a caller can easily pass an
  // unmemoised callback. Re-running would tear down and re-mount PayPal's
  // iframe mid-payment, so the effect reads them through refs instead.
  const latest = useRef({ tr, onSuccess, onError })
  useEffect(() => {
    latest.current = { tr, onSuccess, onError }
  })

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Not authenticated')
    return token
  }, [])

  useEffect(() => {
    let cancelled = false
    let buttonsInstance: PayPalButtonsInstance | null = null

    // Nothing to load; status already reflects the missing configuration.
    if (!clientId) return

    loadPayPalSdk(clientId)
      .then(() => {
        if (cancelled || !window.paypal || !containerRef.current) return

        containerRef.current.innerHTML = ''

        buttonsInstance = window.paypal.Buttons({
          style: { layout: 'vertical', color: 'black', shape: 'rect', label: 'paypal' },
          createOrder: async () => {
            const accessToken = await getAccessToken()
            const response = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ orderNumber }),
            })

            const data = await response.json()
            if (!response.ok) {
              throw new Error(data.message || 'Failed to create PayPal order')
            }

            return data.paypalOrderId
          },
          onApprove: async (data: { orderID: string }) => {
            const accessToken = await getAccessToken()
            const response = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ orderNumber, paypalOrderId: data.orderID }),
            })

            const result = await response.json()
            if (!response.ok) {
              throw new Error(result.message || 'Failed to capture PayPal payment')
            }

            latest.current.onSuccess()
          },
          // Closing the PayPal window is not a failure — clear any stale error
          // so the customer can simply click the button again.
          onCancel: () => {
            if (!cancelled) setErrorKind(null)
          },
          onError: (err: unknown) => {
            console.error('PayPal button error:', err)
            if (!cancelled) setErrorKind('payment')
            latest.current.onError?.(latest.current.tr(
              'PayPal payment failed. Please try again.',
              'Pembayaran PayPal gagal. Silakan coba lagi.'
            ))
          },
        })

        buttonsInstance
          .render(`#${containerId}`)
          .then(() => {
            if (!cancelled) setStatus('ready')
          })
          .catch((err) => {
            // A render rejection after cleanup is expected, not a real failure.
            if (cancelled) return
            console.error('Failed to render PayPal buttons:', err)
            setStatus('error')
            setErrorKind('sdk')
          })
      })
      .catch((err) => {
        console.error('Failed to load PayPal SDK:', err)
        if (!cancelled) {
          setStatus('error')
          setErrorKind('sdk')
        }
      })

    return () => {
      cancelled = true
      buttonsInstance?.close?.().catch(() => {})
    }
  }, [clientId, orderNumber, containerId, getAccessToken])

  return (
    <div>
      {status === 'loading' && (
        <p className="text-sm text-gray-500">{tr('Loading PayPal...', 'Memuat PayPal...')}</p>
      )}
      {status === 'error' && shownError && (
        <p className="text-sm text-red-600 mb-2">{shownError}</p>
      )}
      <div id={containerId} ref={containerRef} />
    </div>
  )
}
