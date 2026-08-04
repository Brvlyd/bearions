import { NextResponse } from 'next/server'
import { getIdrPerUsdRate } from '@/lib/paypal'

// GET /api/fx-rate
//
// Public, unauthenticated: exposes the same live IDR-per-USD rate PayPal
// settlement uses (see lib/paypal.ts), so the storefront can show shipping
// and cart totals in USD for English visitors without duplicating the rate
// source. Read-only and carries no secrets — getIdrPerUsdRate only calls the
// public open.er-api.com endpoint and caches the result in memory.

export async function GET() {
  try {
    const idrPerUsd = await getIdrPerUsdRate()
    return NextResponse.json({ idrPerUsd })
  } catch (error) {
    console.error('Failed to fetch IDR/USD exchange rate:', error)
    return NextResponse.json({ idrPerUsd: null }, { status: 502 })
  }
}
