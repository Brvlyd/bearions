'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Circle, Copy, Check, MapPin, RefreshCw, Truck } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import {
  fetchOrderTracking,
  trackingStatusLabel,
  type OrderTracking,
} from '@/lib/shipping-client'

// The parcel's journey, assembled without anyone typing an update.
//
// System events are written by a database trigger whenever the order changes
// state; courier scans are pulled in by the tracking endpoint this component
// calls. Opening the page is enough to see the latest position.

type Props = {
  orderNumber: string
  /** Poll while the parcel is moving. Off for the admin view, which is glanced at. */
  autoRefresh?: boolean
}

const REFRESH_INTERVAL_MS = 60_000

const isTerminal = (status: string) =>
  ['delivered', 'cancelled', 'refunded'].includes(status)

export default function OrderTrackingTimeline({ orderNumber, autoRefresh = true }: Props) {
  const { tr, language } = useLanguage()
  const [tracking, setTracking] = useState<OrderTracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true)
        setError('')

        const result = await fetchOrderTracking(orderNumber)
        setTracking(result)
      } catch (loadError) {
        console.error('Error loading tracking:', loadError)
        setError(tr('Failed to load tracking.', 'Gagal memuat pelacakan.'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [orderNumber, tr]
  )

  useEffect(() => {
    void load()
  }, [load])

  // Stop polling once the parcel has arrived — there is nothing left to report.
  useEffect(() => {
    if (!autoRefresh || !tracking || isTerminal(tracking.status)) return

    const timer = setInterval(() => void load(true), REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [autoRefresh, tracking, load])

  const handleCopy = async () => {
    if (!tracking?.trackingNumber) return

    try {
      await navigator.clipboard.writeText(tracking.trackingNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (copyError) {
      console.error('Failed to copy tracking number:', copyError)
    }
  }

  if (loading) {
    return (
      <div className="py-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
        <p className="mt-2 text-sm text-gray-600">
          {tr('Loading tracking...', 'Memuat pelacakan...')}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
        <p>{error}</p>
        <button type="button" onClick={() => void load()} className="mt-2 font-semibold underline">
          {tr('Try again', 'Coba lagi')}
        </button>
      </div>
    )
  }

  const events = tracking?.events || []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm text-gray-700">
          {tracking?.courier && (
            <p className="inline-flex items-center gap-2 font-medium text-black">
              <Truck className="w-4 h-4" />
              {tracking.courier}
            </p>
          )}
          {tracking?.trackingNumber ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-sm text-black">{tracking.trackingNumber}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
                aria-label={tr('Copy tracking number', 'Salin nomor resi')}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ) : (
            <p className="mt-1 text-gray-600">
              {tr(
                'Tracking number appears here once the parcel is handed to the courier.',
                'Nomor resi muncul di sini setelah paket diserahkan ke kurir.'
              )}
            </p>
          )}
          {tracking?.etdMinDays && tracking?.etdMaxDays && (
            <p className="mt-1 text-gray-600">
              {tr(
                `Estimated ${tracking.etdMinDays}-${tracking.etdMaxDays} days in transit`,
                `Estimasi ${tracking.etdMinDays}-${tracking.etdMaxDays} hari perjalanan`
              )}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {tr('Refresh', 'Perbarui')}
        </button>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-gray-600">
          {tr('No tracking updates yet.', 'Belum ada pembaruan pelacakan.')}
        </p>
      ) : (
        <ol className="relative border-l border-gray-200 ml-2 space-y-5">
          {/* Newest first: the current position is what people open this for. */}
          {[...events].reverse().map((event, index) => {
            const isLatest = index === 0

            return (
              <li key={event.id} className="ml-5">
                <span
                  className={`absolute -left-[9px] flex items-center justify-center w-[18px] h-[18px] rounded-full ${
                    isLatest ? 'bg-black' : 'bg-white border border-gray-300'
                  }`}
                >
                  {isLatest ? (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  ) : (
                    <Circle className="w-2 h-2 fill-gray-300 text-gray-300" />
                  )}
                </span>

                <p className={`text-sm font-semibold ${isLatest ? 'text-black' : 'text-gray-700'}`}>
                  {trackingStatusLabel(event.status, language)}
                </p>
                <p className="text-sm text-gray-600">
                  {language === 'en'
                    ? event.description
                    : event.description_id || event.description}
                </p>
                {event.location && (
                  <p className="text-xs text-gray-500 inline-flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(event.event_time).toLocaleString(language === 'en' ? 'en-GB' : 'id-ID')}
                  {event.source === 'courier' && ` • ${tr('from courier', 'dari kurir')}`}
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
