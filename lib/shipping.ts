import { supabase } from './supabase'
import type { ShippingAddress } from './supabase'

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
      console.error('Error deleting address:', error)
      throw error
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
