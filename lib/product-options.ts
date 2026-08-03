// Size and color are not per-product data — every product shares the same
// fixed option lists (there is no sizes/colors column, see products schema).
// Kept here as the single source so the detail page and the catalog quick-add
// modal can't drift apart.

export const PRODUCT_SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'] as const

export const PRODUCT_COLOR_OPTIONS = ['Black', 'White', 'Navy', 'Gray', 'Beige'] as const

const COLOR_LABELS_ID: Record<string, string> = {
  Black: 'Hitam',
  White: 'Putih',
  Navy: 'Biru Navy',
  Gray: 'Abu-abu',
  Beige: 'Krem',
}

export function productColorLabel(color: string, language: 'en' | 'id'): string {
  if (language !== 'id') return color
  return COLOR_LABELS_ID[color] || color
}
