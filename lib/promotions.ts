import type {
  AppliedPromotion,
  PromotionRewardType,
  ShippingPromotion,
} from './supabase'

// Promotion rules live in the database, not in code, so the CMS can add
// "buy 5 items, free shipping" without a deploy.
//
// This module is deliberately pure: the checkout page and the order-create API
// both run it over the same inputs, so what the customer is quoted is what the
// server charges. Nothing here reads from Supabase or the network.

export type PromotionContext = {
  /** Total quantity across the cart, not the number of distinct lines. */
  itemCount: number
  /** IDR before shipping and tax. */
  subtotal: number
  /** Billable grams for the parcel. */
  weightGrams: number
  /** Courier price before any discount. */
  shippingCost: number
  countryCode: string
  courierCode: string
}

export type PromotionOutcome = {
  shippingDiscount: number
  orderDiscount: number
  applied: AppliedPromotion[]
  /**
   * Live promotions that did not fire only because the cart is not big enough
   * yet. Drives the "2 more items for free shipping" nudge at checkout.
   */
  nearMisses: NearMiss[]
}

export type NearMiss = {
  promotion: ShippingPromotion
  /** How much more of `condition_type` is needed, in that condition's own unit. */
  remaining: number
}

const round2 = (value: number) => Math.round(value * 100) / 100

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const isDomestic = (countryCode: string) => (countryCode || 'ID').toUpperCase() === 'ID'

/** The measured value a promotion's condition is compared against. */
const measure = (promotion: ShippingPromotion, context: PromotionContext): number => {
  switch (promotion.condition_type) {
    case 'min_items':
      return context.itemCount
    case 'min_subtotal':
      return context.subtotal
    case 'min_weight':
      return context.weightGrams
    case 'always':
    default:
      return Number.POSITIVE_INFINITY
  }
}

/**
 * Scope, country, courier, active window and usage cap — everything except the
 * cart-size condition, which is checked separately so we can report near misses.
 */
const isEligible = (
  promotion: ShippingPromotion,
  context: PromotionContext,
  now: Date
): boolean => {
  if (!promotion.is_active) return false

  if (promotion.starts_at && new Date(promotion.starts_at) > now) return false
  if (promotion.ends_at && new Date(promotion.ends_at) < now) return false

  if (
    promotion.usage_limit !== null &&
    promotion.usage_limit !== undefined &&
    toNumber(promotion.usage_count) >= toNumber(promotion.usage_limit)
  ) {
    return false
  }

  const domestic = isDomestic(context.countryCode)
  if (promotion.scope === 'domestic' && !domestic) return false
  if (promotion.scope === 'international' && domestic) return false

  const countries = promotion.country_codes || []
  if (countries.length > 0 && !countries.includes(context.countryCode.toUpperCase())) {
    return false
  }

  const couriers = promotion.courier_codes || []
  if (couriers.length > 0 && !couriers.includes(context.courierCode.toLowerCase())) {
    return false
  }

  return true
}

/** Discount a single promotion produces, before any cross-promotion capping. */
const rewardFor = (
  promotion: ShippingPromotion,
  context: PromotionContext
): { shipping: number; order: number } => {
  const value = toNumber(promotion.reward_value)
  const cap = promotion.max_discount === null || promotion.max_discount === undefined
    ? null
    : toNumber(promotion.max_discount)

  const applyCap = (amount: number) => (cap === null ? amount : Math.min(amount, cap))

  switch (promotion.reward_type) {
    case 'free_shipping':
      return { shipping: context.shippingCost, order: 0 }
    case 'shipping_percent':
      return { shipping: applyCap((context.shippingCost * value) / 100), order: 0 }
    case 'shipping_fixed':
      return { shipping: Math.min(applyCap(value), context.shippingCost), order: 0 }
    case 'order_percent':
      return { shipping: 0, order: applyCap((context.subtotal * value) / 100) }
    case 'order_fixed':
      return { shipping: 0, order: Math.min(applyCap(value), context.subtotal) }
    default:
      return { shipping: 0, order: 0 }
  }
}

/**
 * Resolve every promotion against one cart.
 *
 * Stackable promotions all apply. Among non-stackable ones only the single most
 * valuable applies, so two overlapping "free shipping" rules can never discount
 * the same shipping twice. Totals are clamped to the shipping cost and subtotal
 * respectively, which keeps a generous rule from producing a negative order.
 */
export function evaluatePromotions(
  promotions: ShippingPromotion[],
  context: PromotionContext,
  now: Date = new Date()
): PromotionOutcome {
  const eligible: ShippingPromotion[] = []
  const nearMisses: NearMiss[] = []

  for (const promotion of promotions) {
    if (!isEligible(promotion, context, now)) continue

    const measured = measure(promotion, context)
    const threshold = toNumber(promotion.condition_value)

    if (measured >= threshold) {
      eligible.push(promotion)
    } else if (promotion.condition_type !== 'always') {
      nearMisses.push({ promotion, remaining: round2(threshold - measured) })
    }
  }

  const scored = eligible.map((promotion) => {
    const reward = rewardFor(promotion, context)
    return { promotion, reward, total: reward.shipping + reward.order }
  })

  const stackable = scored.filter((entry) => entry.promotion.stackable)
  const exclusive = scored.filter((entry) => !entry.promotion.stackable)

  // Highest value wins; priority breaks ties so an admin can force the winner.
  const bestExclusive = exclusive.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return toNumber(b.promotion.priority) - toNumber(a.promotion.priority)
  })[0]

  const winners = bestExclusive ? [...stackable, bestExclusive] : stackable

  let shippingDiscount = 0
  let orderDiscount = 0
  const applied: AppliedPromotion[] = []

  for (const entry of winners) {
    // Clamp per promotion so the running total never exceeds what is on the table.
    const shipping = Math.min(entry.reward.shipping, context.shippingCost - shippingDiscount)
    const order = Math.min(entry.reward.order, context.subtotal - orderDiscount)

    if (shipping <= 0 && order <= 0) continue

    shippingDiscount += Math.max(0, shipping)
    orderDiscount += Math.max(0, order)

    applied.push({
      id: entry.promotion.id,
      name: entry.promotion.name,
      name_id: entry.promotion.name_id,
      reward_type: entry.promotion.reward_type,
      shipping_discount: round2(Math.max(0, shipping)),
      order_discount: round2(Math.max(0, order)),
    })
  }

  nearMisses.sort((a, b) => a.remaining - b.remaining)

  return {
    shippingDiscount: round2(shippingDiscount),
    orderDiscount: round2(orderDiscount),
    applied,
    nearMisses,
  }
}

// ---------------------------------------------------------------------------
// Presentation helpers, shared by checkout and the CMS preview so both describe
// a rule with the same words.
// ---------------------------------------------------------------------------

export const REWARD_TYPES: PromotionRewardType[] = [
  'free_shipping',
  'shipping_percent',
  'shipping_fixed',
  'order_percent',
  'order_fixed',
]

const formatIdrShort = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)

export function describeCondition(
  promotion: Pick<ShippingPromotion, 'condition_type' | 'condition_value'>,
  language: 'en' | 'id'
): string {
  const value = toNumber(promotion.condition_value)

  switch (promotion.condition_type) {
    case 'min_items':
      return language === 'en'
        ? `Buy at least ${value} item${value === 1 ? '' : 's'}`
        : `Beli minimal ${value} item`
    case 'min_subtotal':
      return language === 'en'
        ? `Spend at least ${formatIdrShort(value)}`
        : `Belanja minimal ${formatIdrShort(value)}`
    case 'min_weight':
      return language === 'en'
        ? `Parcel weighs at least ${value} g`
        : `Berat paket minimal ${value} g`
    case 'always':
    default:
      return language === 'en' ? 'Every order' : 'Semua pesanan'
  }
}

export function describeReward(
  promotion: Pick<ShippingPromotion, 'reward_type' | 'reward_value' | 'max_discount'>,
  language: 'en' | 'id'
): string {
  const value = toNumber(promotion.reward_value)
  const cap =
    promotion.max_discount === null || promotion.max_discount === undefined
      ? null
      : toNumber(promotion.max_discount)

  const capSuffix = cap
    ? language === 'en'
      ? ` (max ${formatIdrShort(cap)})`
      : ` (maks ${formatIdrShort(cap)})`
    : ''

  switch (promotion.reward_type) {
    case 'free_shipping':
      return language === 'en' ? 'Free shipping' : 'Gratis ongkir'
    case 'shipping_percent':
      return (language === 'en' ? `${value}% off shipping` : `Diskon ongkir ${value}%`) + capSuffix
    case 'shipping_fixed':
      return language === 'en'
        ? `${formatIdrShort(value)} off shipping`
        : `Potongan ongkir ${formatIdrShort(value)}`
    case 'order_percent':
      return (language === 'en' ? `${value}% off the order` : `Diskon belanja ${value}%`) + capSuffix
    case 'order_fixed':
      return language === 'en'
        ? `${formatIdrShort(value)} off the order`
        : `Potongan belanja ${formatIdrShort(value)}`
    default:
      return ''
  }
}

/** One-line plain-language summary, e.g. "Beli minimal 5 item → Gratis ongkir". */
export function describePromotion(
  promotion: Pick<
    ShippingPromotion,
    'condition_type' | 'condition_value' | 'reward_type' | 'reward_value' | 'max_discount'
  >,
  language: 'en' | 'id'
): string {
  return `${describeCondition(promotion, language)} → ${describeReward(promotion, language)}`
}

/**
 * The subset of a promotion needed to phrase a nudge. Keeps checkout from having
 * to reconstruct a whole row out of what the rates endpoint returned.
 */
export type NearMissLike = {
  promotion: Pick<
    ShippingPromotion,
    'condition_type' | 'condition_value' | 'reward_type' | 'reward_value' | 'max_discount'
  >
  remaining: number
}

/** "Add 2 more items to get free shipping" — the checkout nudge. */
export function describeNearMiss(nearMiss: NearMissLike, language: 'en' | 'id'): string {
  const { promotion, remaining } = nearMiss
  const reward = describeReward(promotion, language).toLowerCase()

  switch (promotion.condition_type) {
    case 'min_items': {
      const count = Math.ceil(remaining)
      return language === 'en'
        ? `Add ${count} more item${count === 1 ? '' : 's'} to get ${reward}`
        : `Tambah ${count} item lagi untuk ${reward}`
    }
    case 'min_subtotal':
      return language === 'en'
        ? `Spend ${formatIdrShort(remaining)} more to get ${reward}`
        : `Belanja ${formatIdrShort(remaining)} lagi untuk ${reward}`
    case 'min_weight':
      return language === 'en'
        ? `Add ${Math.ceil(remaining)} g more to get ${reward}`
        : `Tambah ${Math.ceil(remaining)} g lagi untuk ${reward}`
    default:
      return describeReward(promotion, language)
  }
}
