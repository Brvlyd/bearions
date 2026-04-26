import { supabase } from './supabase'
import type { ShippingAddress } from './supabase'

type SupabaseErrorLike = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

const parseSupabaseError = (error: unknown, fallback = 'Unknown error') => {
  const err = (error || {}) as SupabaseErrorLike
  const message = err.message || fallback
  const details = err.details || ''
  const hint = err.hint || ''
  const code = err.code || 'UNKNOWN'

  return {
    message,
    details,
    hint,
    code,
  }
}

export const shippingService = {
  // Get user shipping addresses
  async getUserAddresses(userId: string): Promise<ShippingAddress[]> {
    try {
      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error getting addresses:', error)
      throw error
    }
  },

  // Get default address
  async getDefaultAddress(userId: string): Promise<ShippingAddress | null> {
    try {
      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data
    } catch (error) {
      console.error('Error getting default address:', error)
      return null
    }
  },

  // Create shipping address
  async createAddress(
    userId: string,
    addressData: Omit<ShippingAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<ShippingAddress> {
    try {
      const { count, error: countError } = await supabase
        .from('shipping_addresses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (countError) throw countError

      if ((count || 0) >= 3) {
        throw new Error('MAX_ADDRESSES_REACHED')
      }

      // If this is set as default, unset other default addresses
      if (addressData.is_default) {
        await supabase
          .from('shipping_addresses')
          .update({ is_default: false })
          .eq('user_id', userId)
      }

      const { data, error } = await supabase
        .from('shipping_addresses')
        .insert({
          user_id: userId,
          ...addressData,
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating address:', error)
      throw error
    }
  },

  // Update shipping address
  async updateAddress(
    addressId: string,
    userId: string,
    addressData: Partial<Omit<ShippingAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<ShippingAddress> {
    try {
      // If this is set as default, unset other default addresses
      if (addressData.is_default) {
        await supabase
          .from('shipping_addresses')
          .update({ is_default: false })
          .eq('user_id', userId)
          .neq('id', addressId)
      }

      const { data, error } = await supabase
        .from('shipping_addresses')
        .update(addressData)
        .eq('id', addressId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating address:', error)
      throw error
    }
  },

  // Delete shipping address
  async deleteAddress(addressId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('shipping_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', userId)

      if (error) throw error
    } catch (error) {
      const parsed = parseSupabaseError(error)
      console.error('Error deleting address:', parsed)

      if (parsed.code === '42501') {
        throw new Error('ADDRESS_DELETE_NOT_ALLOWED')
      }

      if (parsed.code === '23503') {
        throw new Error('ADDRESS_DELETE_REQUIRES_DB_MIGRATION')
      }

      throw new Error(`ADDRESS_DELETE_FAILED:${parsed.code}`)
    }
  },

  // Set default address
  async setDefaultAddress(addressId: string, userId: string): Promise<void> {
    try {
      // Unset all other default addresses
      await supabase
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('user_id', userId)

      // Set new default
      const { error } = await supabase
        .from('shipping_addresses')
        .update({ is_default: true })
        .eq('id', addressId)
        .eq('user_id', userId)

      if (error) throw error
    } catch (error) {
      console.error('Error setting default address:', error)
      throw error
    }
  },
}
