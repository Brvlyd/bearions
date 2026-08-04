'use client'

import { useEffect, useState } from 'react'

/**
 * Live IDR-per-USD rate for display, fetched once from /api/fx-rate — which
 * serves the same rate PayPal settlement locks in at order creation (see
 * lib/paypal.ts getIdrPerUsdRate). Null while loading or if the live rate
 * is unavailable; callers should fall back to IDR in that case.
 */
export function useIdrPerUsdRate(): number | null {
  const [idrPerUsd, setIdrPerUsd] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/fx-rate')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && typeof data?.idrPerUsd === 'number') {
          setIdrPerUsd(data.idrPerUsd)
        }
      })
      .catch((error) => console.error('Failed to load IDR/USD rate:', error))

    return () => {
      cancelled = true
    }
  }, [])

  return idrPerUsd
}
