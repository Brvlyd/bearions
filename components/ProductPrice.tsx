'use client'

import { useLanguage } from '@/lib/i18n'
import {
  formatIDR,
  formatProductPrice,
  formatProductPriceAlt,
  getDiscountAmount,
  getDiscountPercent,
  getIdrPrice,
  getSalePrice,
  isDiscounted,
  type PricedProduct,
} from '@/lib/price'
import DiscountBadge from './DiscountBadge'

// Every storefront price goes through here. A discounted product reads the same
// way everywhere: the sale price loud and in red, the original crossed out next
// to it, and the percentage saved as a badge.
//
// A discount is always quoted in rupiah because sale_price is an IDR column —
// the manual USD price is a full-price figure and would contradict the markdown.

type Size = 'sm' | 'md' | 'lg'

const SALE_CLASS: Record<Size, string> = {
  sm: 'text-base sm:text-lg font-bold',
  md: 'text-lg font-bold',
  lg: 'text-3xl lg:text-4xl font-extrabold',
}

const ORIGINAL_CLASS: Record<Size, string> = {
  sm: 'text-xs sm:text-sm',
  md: 'text-sm',
  lg: 'text-base lg:text-lg',
}

const PLAIN_CLASS: Record<Size, string> = {
  sm: 'text-base sm:text-lg font-bold',
  md: 'text-lg font-bold',
  lg: 'text-2xl lg:text-3xl font-bold',
}

type ProductPriceProps = {
  product: PricedProduct
  size?: Size
  /** Adds the "Hemat Rp 130.000" line under a discounted price. */
  showSavings?: boolean
  /** Adds the secondary currency line — detail pages only, cards stay compact. */
  showAlt?: boolean
  className?: string
}

export default function ProductPrice({
  product,
  size = 'md',
  showSavings = false,
  showAlt = false,
  className = '',
}: ProductPriceProps) {
  const { tr, language } = useLanguage()

  if (isDiscounted(product)) {
    const percent = getDiscountPercent(product)
    const savings = getDiscountAmount(product)

    return (
      <div className={className}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`${SALE_CLASS[size]} text-red-600`} suppressHydrationWarning>
            {formatIDR(getSalePrice(product)!)}
          </span>
          {percent !== null && percent > 0 && (
            <DiscountBadge percent={percent} size={size === 'lg' ? 'md' : 'sm'} />
          )}
        </div>
        <p
          className={`${ORIGINAL_CLASS[size]} text-gray-400 line-through`}
          suppressHydrationWarning
        >
          {formatIDR(getIdrPrice(product))}
        </p>
        {showSavings && savings > 0 && (
          <p className="mt-1 text-sm font-semibold text-emerald-600" suppressHydrationWarning>
            {tr(`You save ${formatIDR(savings)}`, `Hemat ${formatIDR(savings)}`)}
          </p>
        )}
      </div>
    )
  }

  const altPrice = showAlt ? formatProductPriceAlt(product, language) : null

  return (
    <div className={className}>
      <p className={`${PLAIN_CLASS[size]} text-black`} suppressHydrationWarning>
        {formatProductPrice(product, language)}
      </p>
      {altPrice && (
        <p className="mt-1 text-sm text-gray-500" suppressHydrationWarning>
          {language === 'en' ? tr(`Billed as ${altPrice} at checkout`, altPrice) : altPrice}
        </p>
      )}
    </div>
  )
}
