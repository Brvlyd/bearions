import { supabase, Product } from './supabase'

export const productService = {
  // Get all products
  async getAllProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Product[]
  },

  // Get product by ID
  async getProductById(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Product
  },

  // Search products
  async searchProducts(query: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Product[]
  },

  // Filter by category
  async getProductsByCategory(category: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Product[]
  },

  // Create product (admin only)
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single()

    if (error) throw error
    return data as Product
  },

  // Update product (admin only)
  async updateProduct(id: string, updates: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Product
  },

  // Update stock (admin only)
  async updateStock(id: string, stock: number) {
    const { data, error } = await supabase
      .from('products')
      .update({ stock })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Product
  },

  // Delete product (admin only)
  async deleteProduct(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Save product images (admin only)
  async saveProductImages(productId: string, imageUrls: string[]) {
    await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId)

    if (imageUrls.length > 0) {
      const images = imageUrls.map((url, index) => ({
        product_id: productId,
        image_url: url,
        display_order: index
      }))

      const { error } = await supabase
        .from('product_images')
        .insert(images)

      if (error) throw error

      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: imageUrls[0] })
        .eq('id', productId)

      if (updateError) throw updateError
      return
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ image_url: null })
      .eq('id', productId)

    if (updateError) throw updateError
  },

  // Get product images
  async getProductImages(productId: string) {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data
  },

  // Resolve the full ordered image list for a product, with fallback to the
  // legacy main image column when no gallery rows exist yet.
  async getProductImageUrls(productId: string, fallbackImageUrl?: string | null) {
    const images = await this.getProductImages(productId)
    const imageUrls = (images || [])
      .map((img: { image_url?: string | null }) => img.image_url)
      .filter((url): url is string => Boolean(url))

    if (imageUrls.length > 0) {
      return imageUrls
    }

    return fallbackImageUrl ? [fallbackImageUrl] : []
  },

  // Get images for many products in one round-trip, keyed by product id.
  // Rendering a grid of cards that each fetch their own images costs one
  // request per card and leaves the catalog on spinners for seconds.
  async getImagesForProducts(productIds: string[]): Promise<Record<string, string[]>> {
    if (productIds.length === 0) return {}

    const { data, error } = await supabase
      .from('product_images')
      .select('product_id, image_url, display_order')
      .in('product_id', productIds)
      .order('display_order', { ascending: true })

    if (error) throw error

    const byProduct: Record<string, string[]> = {}
    for (const row of data || []) {
      const key = row.product_id as string
      ;(byProduct[key] ||= []).push(row.image_url as string)
    }
    return byProduct
  },

  // Delete product image
  async deleteProductImage(imageId: string) {
    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)

    if (error) throw error
  }
}
