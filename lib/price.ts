import type { Product } from './supabase'

export type PriceLanguage = 'en' | 'id'

/** Product fields any price formatter needs — keeps these usable with partial rows. */
export type PricedProduct = Pick<Product, 'price'> & Partial<Pick<Product, 'price_usd' | 'sale_price'>>

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
 * Same division PayPal settlement uses (see app/api/paypal/create-order),
 * so a displayed USD estimate always matches what the customer would
 * actually be charged at that rate.
 */
export const convertIdrToUsd = (idrAmount: number, idrPerUsd: number): string =>
  (idrAmount / idrPerUsd).toFixed(2)

/**
 * Renders an arbitrary IDR amount — shipping, cart/order totals, anything
 * not tied to a product's manual `price_usd` — in USD for English visitors
 * once a live rate has loaded. Falls back to IDR while the rate is still
 * loading or unavailable, since there is nothing else to convert with.
 */
export const formatIdrAmount = (
  amount: number,
  language: PriceLanguage,
  idrPerUsd: number | null
): string => {
  if (language === 'en' && idrPerUsd) {
    return formatUSD(Number(convertIdrToUsd(amount, idrPerUsd)))
  }
  return formatIDR(amount)
}

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

export const getSalePrice = (product: PricedProduct): number | null => {
  const raw = product.sale_price
  if (raw === null || raw === undefined) return null

  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

export const isDiscounted = (product: PricedProduct): boolean => {
  const salePrice = getSalePrice(product)
  return salePrice !== null && salePrice < getIdrPrice(product)
}

/**
 * Whole-percent saving, e.g. 34 for Rp 380.000 marked down to Rp 250.000.
 * Null when the product is not on sale — that is what drives the "-34%" badge.
 */
export const getDiscountPercent = (product: PricedProduct): number | null => {
  if (!isDiscounted(product)) return null

  const price = getIdrPrice(product)
  if (price <= 0) return null

  return Math.round(((price - getSalePrice(product)!) / price) * 100)
}

/** How many rupiah the customer saves on one unit. Zero when not discounted. */
export const getDiscountAmount = (product: PricedProduct): number => {
  if (!isDiscounted(product)) return 0
  return getIdrPrice(product) - getSalePrice(product)!
}

/**
 * The USD sale price, derived by applying the same percent-off to price_usd
 * as sale_price applies to the IDR price. sale_price itself is IDR-only —
 * there is no admin field for a USD markdown — so this is the only way to
 * show a discount to English visitors without contradicting the IDR discount
 * percentage. Null when the product has no manual USD price or is not on sale.
 */
export const getUsdSalePrice = (product: PricedProduct): number | null => {
  const usd = getUsdPrice(product)
  if (usd === null || !isDiscounted(product)) return null

  const price = getIdrPrice(product)
  if (price <= 0) return null

  return usd * (getSalePrice(product)! / price)
}

export type SalePriceDraft = {
  /** The admin typed something into the sale price field. */
  filled: boolean
  /** Filled in, but not a markdown: zero, negative, or above the normal price. */
  invalid: boolean
  percent: number | null
  savings: number
  price: number
  salePrice: number
}

/**
 * Read the CMS price pair while it is still two form strings, so the product
 * form can preview the markdown and refuse to save a "discount" that raises the
 * price.
 */
export const describeSalePriceDraft = (price: string, salePrice: string): SalePriceDraft => {
  const priceValue = Number.parseFloat(price)
  const salePriceValue = Number.parseFloat(salePrice)
  const filled = salePrice.trim() !== ''

  if (!filled || !Number.isFinite(salePriceValue)) {
    return {
      filled,
      invalid: filled,
      percent: null,
      savings: 0,
      price: Number.isFinite(priceValue) ? priceValue : 0,
      salePrice: 0,
    }
  }

  // A price that is still being typed is not yet wrong — only judge the sale
  // price against a normal price the admin has actually finished entering.
  const comparable = Number.isFinite(priceValue) && priceValue > 0
  const invalid = salePriceValue <= 0 || (comparable && salePriceValue >= priceValue)

  return {
    filled,
    invalid,
    percent:
      comparable && !invalid ? Math.round(((priceValue - salePriceValue) / priceValue) * 100) : null,
    savings: comparable && !invalid ? priceValue - salePriceValue : 0,
    price: comparable ? priceValue : 0,
    salePrice: salePriceValue,
  }
}

export const formatProductPrice = (product: PricedProduct, language: PriceLanguage) => {
  const salePrice = isDiscounted(product) ? getSalePrice(product) : null
  const usd = getUsdPrice(product)

  if (salePrice !== null && (language === 'id' || usd === null)) {
    return formatIDR(salePrice)
  }

  return language === 'en' && usd !== null ? formatUSD(usd) : formatIDR(getIdrPrice(product))
}

export const getEffectiveIdrPrice = (product: PricedProduct): number => {
  const salePrice = isDiscounted(product) ? getSalePrice(product) : null
  return salePrice !== null ? salePrice : getIdrPrice(product)
}

export const formatProductPriceAlt = (product: PricedProduct, language: PriceLanguage) => {
  const salePrice = isDiscounted(product) ? getSalePrice(product) : null
  const usd = getUsdPrice(product)

  if (salePrice !== null && (language === 'id' || usd === null)) {
    return formatIDR(getIdrPrice(product))
  }

  if (usd === null) return null

  return language === 'en' ? formatIDR(getIdrPrice(product)) : formatUSD(usd)
}
