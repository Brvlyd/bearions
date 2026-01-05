import { supabase } from './supabase'
import type { Payment, Order } from './supabase'

export const paymentService = {
  // Create payment record
  async createPayment(paymentData: {
    orderId: string
    paymentMethod: string
    amount: number
    paymentGateway?: string
  }): Promise<Payment> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          order_id: paymentData.orderId,
          payment_method: paymentData.paymentMethod,
          amount: paymentData.amount,
          payment_gateway: paymentData.paymentGateway || null,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating payment:', error)
      throw error
    }
  },

  // Update payment status
  async updatePaymentStatus(
    paymentId: string,
    status: Payment['status'],
    additionalData?: {
      transactionId?: string
      paidAt?: string
      gatewayResponse?: any
    }
  ): Promise<Payment> {
    try {
      const updateData: any = { status }

      if (additionalData?.transactionId) {
        updateData.transaction_id = additionalData.transactionId
      }

      if (additionalData?.paidAt) {
        updateData.paid_at = additionalData.paidAt
      }

      if (additionalData?.gatewayResponse) {
        updateData.gateway_response = additionalData.gatewayResponse
      }

      if (status === 'success' && !updateData.paid_at) {
        updateData.paid_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating payment status:', error)
      throw error
    }
  },

  // Get payment by order ID
  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data
    } catch (error) {
      console.error('Error getting payment:', error)
      return null
    }
  },

  // Upload payment proof
  async uploadPaymentProof(
    paymentId: string,
    file: File
  ): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${paymentId}-${Date.now()}.${fileExt}`
      const filePath = `payment-proofs/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      // Update payment record
      await supabase
        .from('payments')
        .update({ payment_proof_url: publicUrl })
        .eq('id', paymentId)

      return publicUrl
    } catch (error) {
      console.error('Error uploading payment proof:', error)
      throw error
    }
  },

  // Process manual bank transfer
  async processManualTransfer(
    orderId: string,
    amount: number,
    bankName: string,
    accountNumber: string
  ): Promise<Payment> {
    try {
      const payment = await this.createPayment({
        orderId,
        paymentMethod: 'bank_transfer',
        amount,
        paymentGateway: 'manual',
      })

      // Update payment with bank details
      const { data, error } = await supabase
        .from('payments')
        .update({
          gateway_response: {
            bank_name: bankName,
            account_number: accountNumber,
          },
        })
        .eq('id', payment.id)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error processing manual transfer:', error)
      throw error
    }
  },

  // Verify payment (admin)
  async verifyPayment(paymentId: string, verified: boolean): Promise<void> {
    try {
      const status = verified ? 'success' : 'failed'
      await this.updatePaymentStatus(paymentId, status, {
        paidAt: verified ? new Date().toISOString() : undefined,
      })

      // Update order payment status
      const payment = await supabase
        .from('payments')
        .select('order_id')
        .eq('id', paymentId)
        .single()

      if (payment.data) {
        await supabase
          .from('orders')
          .update({ payment_status: verified ? 'paid' : 'failed' })
          .eq('id', payment.data.order_id)
      }
    } catch (error) {
      console.error('Error verifying payment:', error)
      throw error
    }
  },
}
