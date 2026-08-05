import { supabase } from './supabase'
import { PRODUCT_COLOR_OPTIONS, productColorLabel } from './product-options'

/** A colour an admin defined for one product, in db/migrations/add-product-colors.sql. */
export type ProductColor = {
  id: string
  product_id: string
  name: string
  name_id: string | null
  hex_code: string | null
  image_url: string | null
  display_order: number
}

/**
 * What the storefront renders a swatch from. Products with no CMS colours fall
 * back to the shared default list, which has names but no photos — so callers
 * must treat `image_url` as optional rather than assuming a popup is possible.
 */
export type ColorOption = {
  name: string
  label: string
  hex: string | null
  imageUrl: string | null
}

/** Rough swatch colours for the shared fallback list, so it still reads as colours. */
const DEFAULT_COLOR_HEX: Record<string, string> = {
  Black: '#111111',
  White: '#f5f5f5',
  Navy: '#1e3a5f',
  Gray: '#9ca3af',
  Beige: '#e3d5c0',
}

const isMissingTableError = (error: unknown) => {
  const err = (error || {}) as { code?: string; message?: string }
  const combined = `${err.code || ''} ${err.message || ''}`.toLowerCase()
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    (combined.includes('product_colors') &&
      (combined.includes('does not exist') || combined.includes('schema cache')))
  )
}

const normalizeRow = (raw: Record<string, unknown>): ProductColor => ({
  id: String(raw.id),
  product_id: String(raw.product_id),
  name: String(raw.name || '').trim(),
  name_id: typeof raw.name_id === 'string' && raw.name_id.trim() ? raw.name_id.trim() : null,
  hex_code: typeof raw.hex_code === 'string' && raw.hex_code.trim() ? raw.hex_code.trim() : null,
  image_url: typeof raw.image_url === 'string' && raw.image_url.trim() ? raw.image_url.trim() : null,
  display_order: Number(raw.display_order || 0),
})

export const productColorService = {
  /**
   * Colours for one product. A missing table is answered with an empty list
   * rather than a throw: the storefront then shows the default colours, which
   * is the same thing it did before this feature existed.
   */
  async getColorsForProduct(productId: string): Promise<ProductColor[]> {
    const { data, error } = await supabase
      .from('product_colors')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true })

    if (error) {
      if (isMissingTableError(error)) return []
      throw error
    }

    return (data || []).map((row) => normalizeRow(row as Record<string, unknown>))
  },

  /**
   * Replaces a product's colours in one shot. Deleting first keeps the write
   * idempotent — the editor hands over the final list, not a diff.
   */
  async saveProductColors(
    productId: string,
    colors: Array<Omit<ProductColor, 'id' | 'product_id' | 'display_order'>>
  ) {
    const { error: deleteError } = await supabase
      .from('product_colors')
      .delete()
      .eq('product_id', productId)

    if (deleteError) throw deleteError

    if (colors.length === 0) return

    const rows = colors.map((color, index) => ({
      product_id: productId,
      name: color.name.trim(),
      name_id: color.name_id?.trim() || null,
      hex_code: color.hex_code?.trim() || null,
      image_url: color.image_url?.trim() || null,
      display_order: index,
    }))

    const { error } = await supabase.from('product_colors').insert(rows)
    if (error) throw error
  },
}

/**
 * The colour list a shopper actually sees. `rows` empty (no CMS colours, or the
 * migration has not been run yet) falls back to the shared default list.
 */
export function resolveColorOptions(
  rows: ProductColor[] | null | undefined,
  language: 'en' | 'id'
): ColorOption[] {
  const named = (rows || []).filter((row) => row.name)

  if (named.length === 0) {
    return PRODUCT_COLOR_OPTIONS.map((name) => ({
      name,
      label: productColorLabel(name, language),
      hex: DEFAULT_COLOR_HEX[name] ?? null,
      imageUrl: null,
    }))
  }

  return named.map((row) => ({
    name: row.name,
    label: language === 'id' && row.name_id ? row.name_id : row.name,
    hex: row.hex_code,
    imageUrl: row.image_url,
  }))
}
