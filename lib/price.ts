import type { Product } from './supabase'

export type PriceLanguage = 'en' | 'id'

/** Product fields any price formatter needs — keeps these usable with partial rows. */
type PricedProduct = Pick<Product, 'price'> & Partial<Pick<Product, 'price_usd'>>

export const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)

export const formatUSD = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)

/**
 * The USD price an admin typed into the CMS, or null when there is none.
 * Postgres numerics can arrive as strings, so coerce before trusting the value.
 */
export const getUsdPrice = (product: PricedProduct): number | null => {
  const raw = product.price_usd
  if (raw === null || raw === undefined) return null

  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

export const getIdrPrice = (product: PricedProduct): number => {
  const value = Number(product.price)
  return Number.isFinite(value) ? value : 0
}

/**
 * Headline storefront price: USD for English visitors when the CMS has one,
 * IDR otherwise. This never converts — both numbers are entered by hand.
 */
export const formatProductPrice = (product: PricedProduct, language: PriceLanguage) => {
  const usd = getUsdPrice(product)
  return language === 'en' && usd !== null ? formatUSD(usd) : formatIDR(getIdrPrice(product))
}

/**
 * The other currency, for a secondary line under the headline price.
 * Returns null when there is no USD price to pair with the IDR one.
 */
export const formatProductPriceAlt = (product: PricedProduct, language: PriceLanguage) => {
  const usd = getUsdPrice(product)
  if (usd === null) return null

  return language === 'en' ? formatIDR(getIdrPrice(product)) : formatUSD(usd)
}
