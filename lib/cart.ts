import { supabase } from './supabase'
import type { Cart, CartItem } from './supabase'

const isUniqueViolation = (error: { code?: string; message?: string } | null) => {
  if (!error) return false
  return error.code === '23505' || error.message?.toLowerCase().includes('duplicate key')
}

const isRlsViolation = (error: { code?: string; message?: string } | null) => {
  if (!error) return false
  return error.code === '42501' || error.message?.toLowerCase().includes('row-level security')
}

export const cartService = {
  // Get or create cart for user
  async getOrCreateCart(userId: string): Promise<Cart> {
    try {
      // Try to get existing cart
      const { data: existingCart, error: fetchError } = await supabase
        .from('carts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (existingCart) {
        return existingCart
      }

      // Create new cart if doesn't exist
      const { data: newCart, error: createError } = await supabase
        .from('carts')
        .insert({ user_id: userId })
        .select()
        .single()

      if (createError) {
        // If unique constraint exists and another request created the cart first, re-fetch it.
        if (isUniqueViolation(createError)) {
          const { data: retryCart, error: retryError } = await supabase
            .from('carts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (retryError) throw retryError
          if (retryCart) return retryCart
        }

        if (isRlsViolation(createError)) {
          throw new Error('CART_POLICY_ERROR: Tidak bisa membuat cart untuk user ini. Jalankan SQL fix policy cart di Supabase.')
        }

        throw createError
      }

      return newCart
    } catch (error) {
      console.error('Error getting or creating cart:', error)
      throw error
    }
  },

  // Get cart items with product details
  async getCartItems(userId: string): Promise<CartItem[]> {
    try {
      const cart = await this.getOrCreateCart(userId)

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('cart_id', cart.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error getting cart items:', error)
      throw error
    }
  },

  // Add item to cart
  async addToCart(
    userId: string,
    productId: string,
    quantity: number = 1,
    size?: string,
    color?: string
  ): Promise<CartItem> {
    try {
      const cart = await this.getOrCreateCart(userId)

      // Check if item already exists in cart
      let existingItemQuery = supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', cart.id)
        .eq('product_id', productId)

      existingItemQuery = size ? existingItemQuery.eq('size', size) : existingItemQuery.is('size', null)
      existingItemQuery = color ? existingItemQuery.eq('color', color) : existingItemQuery.is('color', null)

      const { data: existingItem, error: existingItemError } = await existingItemQuery.maybeSingle()

      if (existingItemError) throw existingItemError

      if (existingItem) {
        // Update quantity if item exists
        return await this.updateCartItemQuantity(
          existingItem.id,
          existingItem.quantity + quantity
        )
      }

      // Add new item
      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          product_id: productId,
          quantity,
          size: size || null,
          color: color || null,
        })
        .select(`
          *,
          product:products(*)
        `)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error adding to cart:', error)
      throw error
    }
  },

  // Update cart item quantity
  async updateCartItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<CartItem> {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)
        .select(`
          *,
          product:products(*)
        `)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating cart item:', error)
      throw error
    }
  },

  // Remove item from cart
  async removeFromCart(itemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
    } catch (error) {
      console.error('Error removing from cart:', error)
      throw error
    }
  },

  // Clear cart
  async clearCart(userId: string): Promise<void> {
    try {
      const cart = await this.getOrCreateCart(userId)

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id)

      if (error) throw error
    } catch (error) {
      console.error('Error clearing cart:', error)
      throw error
    }
  },

  // Get cart total
  async getCartTotal(userId: string): Promise<number> {
    try {
      const items = await this.getCartItems(userId)
      return items.reduce((total, item) => {
        const price = item.product?.price || 0
        return total + price * item.quantity
      }, 0)
    } catch (error) {
      console.error('Error getting cart total:', error)
      return 0
    }
  },

  // Get cart count
  async getCartCount(userId: string): Promise<number> {
    try {
      const items = await this.getCartItems(userId)
      return items.reduce((count, item) => count + item.quantity, 0)
    } catch (error) {
      console.error('Error getting cart count:', error)
      return 0
    }
  },
}
