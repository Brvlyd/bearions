import { supabase } from './supabase'
import type { Order, OrderItem, ShippingAddress } from './supabase'

export const orderService = {
  // Create new order
  async createOrder(orderData: {
    userId?: string
    customerName: string
    customerEmail: string
    customerPhone: string
    items: Array<{
      productId: string
      productName: string
      productImageUrl: string | null
      productSku?: string
      quantity: number
      size?: string
      color?: string
      price: number
    }>
    shippingAddressId?: string
    shippingCost: number
    tax: number
    discount: number
    paymentMethod: string
    customerNotes?: string
  }): Promise<Order> {
    try {
      // Calculate totals
      const subtotal = orderData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
      const total = subtotal + orderData.shippingCost + orderData.tax - orderData.discount

      // Generate order number
      const { data: orderNumberData } = await supabase.rpc('generate_order_number')
      const orderNumber = orderNumberData || `BRN${Date.now()}`

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: orderData.userId || null,
          customer_name: orderData.customerName,
          customer_email: orderData.customerEmail,
          customer_phone: orderData.customerPhone,
          subtotal,
          shipping_cost: orderData.shippingCost,
          tax: orderData.tax,
          discount: orderData.discount,
          total,
          payment_method: orderData.paymentMethod,
          shipping_address_id: orderData.shippingAddressId || null,
          customer_notes: orderData.customerNotes || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = orderData.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        product_image_url: item.productImageUrl,
        product_sku: item.productSku || null,
        quantity: item.quantity,
        size: item.size || null,
        color: item.color || null,
        price: item.price,
        subtotal: item.price * item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      return order
    } catch (error) {
      console.error('Error creating order:', error)
      throw error
    }
  },

  // Get user orders
  async getUserOrders(userId: string): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error getting user orders:', error)
      throw error
    }
  },

  // Get order by ID
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error getting order:', error)
      return null
    }
  },

  // Get order by order number
  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error getting order:', error)
      return null
    }
  },

  // Get order items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error getting order items:', error)
      throw error
    }
  },

  // Update order status
  async updateOrderStatus(
    orderId: string,
    status: Order['status']
  ): Promise<Order> {
    try {
      const updateData: any = { status }

      // Set timestamp based on status
      if (status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString()
      } else if (status === 'shipped') {
        updateData.shipped_at = new Date().toISOString()
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating order status:', error)
      throw error
    }
  },

  // Update payment status
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: Order['payment_status']
  ): Promise<Order> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ payment_status: paymentStatus })
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating payment status:', error)
      throw error
    }
  },

  // Update tracking info
  async updateTrackingInfo(
    orderId: string,
    trackingNumber: string,
    courier: string,
    estimatedDelivery?: string
  ): Promise<Order> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          tracking_number: trackingNumber,
          courier,
          estimated_delivery: estimatedDelivery || null,
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating tracking info:', error)
      throw error
    }
  },

  // Get all orders (admin)
  async getAllOrders(
    filters?: {
      status?: Order['status']
      paymentStatus?: Order['payment_status']
      limit?: number
    }
  ): Promise<Order[]> {
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error getting all orders:', error)
      throw error
    }
  },
}
