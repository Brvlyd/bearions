import { supabase } from './supabase'
import type { Cart, CartItem, Product } from './supabase'

export const cartService = {
  // Get or create cart for user
  async getOrCreateCart(userId: string): Promise<Cart> {
    try {
      // Try to get existing cart
      const { data: existingCart, error: fetchError } = await supabase
        .from('carts')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (existingCart) {
        return existingCart
      }

      // Create new cart if doesn't exist
      const { data: newCart, error: createError } = await supabase
        .from('carts')
        .insert({ user_id: userId })
        .select()
        .single()

      if (createError) throw createError

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
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', cart.id)
        .eq('product_id', productId)
        .eq('size', size || null)
        .eq('color', color || null)
        .single()

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
