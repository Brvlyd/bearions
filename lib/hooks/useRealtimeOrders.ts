import { useEffect, useRef } from 'react'
import { Order, Payment, supabase } from '@/lib/supabase'
import { orderService } from '@/lib/orders'

interface UseRealtimeOrdersProps {
  onOrdersChange: (orders: Order[]) => void
  onProofStatusChange: (proofStatusMap: Record<string, Payment['proof_verification_status']>) => void
  onLoading: (loading: boolean) => void
}

export function useRealtimeOrders({
  onOrdersChange,
  onProofStatusChange,
  onLoading
}: UseRealtimeOrdersProps) {
  const subscriptionsRef = useRef<Array<() => void>>([])

  useEffect(() => {
    let isMounted = true

    const setupRealtime = async () => {
      try {
        // Initial load
        onLoading(true)
        const data = await orderService.getAllOrders()
        
        if (!isMounted) return

        onOrdersChange(data)

        if (data.length > 0) {
          const orderIds = data.map((order) => order.id)
          const { data: payments } = await supabase
            .from('payments')
            .select('order_id, proof_verification_status, created_at, payment_proof_url')
            .in('order_id', orderIds)
            .not('payment_proof_url', 'is', null)
            .order('created_at', { ascending: false })

          if (!isMounted) return

          const mapped: Record<string, Payment['proof_verification_status']> = {}
          for (const payment of payments || []) {
            if (!mapped[payment.order_id]) {
              mapped[payment.order_id] = payment.proof_verification_status || 'pending'
            }
          }
          onProofStatusChange(mapped)
        }

        // Subscribe to orders changes
        const ordersChannel = supabase
          .channel('orders-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
            },
            (payload) => {
              console.log('📦 Order update:', payload)
              if (isMounted) {
                // Reload orders ketika ada perubahan
                loadOrdersData()
              }
            }
          )
          .subscribe()

        // Subscribe to payments changes (untuk proof verification)
        const paymentsChannel = supabase
          .channel('payments-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'payments',
            },
            (payload) => {
              console.log('💳 Payment update:', payload)
              if (isMounted) {
                loadProofStatus()
              }
            }
          )
          .subscribe()

        // Store unsubscribe functions
        subscriptionsRef.current = [
          () => supabase.removeChannel(ordersChannel),
          () => supabase.removeChannel(paymentsChannel)
        ]
      } catch (error) {
        console.error('Error setting up realtime:', error)
      } finally {
        if (isMounted) {
          onLoading(false)
        }
      }
    }

    const loadOrdersData = async () => {
      try {
        const data = await orderService.getAllOrders()
        if (isMounted) {
          onOrdersChange(data)
        }
      } catch (error) {
        console.error('Error reloading orders:', error)
      }
    }

    const loadProofStatus = async () => {
      try {
        const { data: orders } = await supabase
          .from('orders')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(100) // Ambil 100 pesanan terbaru

        if (!orders || orders.length === 0) return

        const orderIds = orders.map((o) => o.id)
        const { data: payments } = await supabase
          .from('payments')
          .select('order_id, proof_verification_status, created_at, payment_proof_url')
          .in('order_id', orderIds)
          .not('payment_proof_url', 'is', null)
          .order('created_at', { ascending: false })

        if (!isMounted) return

        const mapped: Record<string, Payment['proof_verification_status']> = {}
        for (const payment of payments || []) {
          if (!mapped[payment.order_id]) {
            mapped[payment.order_id] = payment.proof_verification_status || 'pending'
          }
        }
        onProofStatusChange(mapped)
      } catch (error) {
        console.error('Error reloading proof status:', error)
      }
    }

    setupRealtime()

    // Cleanup
    return () => {
      isMounted = false
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe())
    }
  }, [])
}
