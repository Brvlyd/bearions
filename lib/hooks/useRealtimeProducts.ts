import { useEffect, useRef } from 'react'
import { Product, supabase } from '@/lib/supabase'
import { productService } from '@/lib/products'

interface UseRealtimeProductsProps {
  onProductsChange: (products: Product[]) => void
  onLoading: (loading: boolean) => void
}

export function useRealtimeProducts({
  onProductsChange,
  onLoading
}: UseRealtimeProductsProps) {
  const subscriptionRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let isMounted = true

    const setupRealtime = async () => {
      try {
        // Initial load
        onLoading(true)
        const data = await productService.getAllProducts()
        
        if (!isMounted) return
        
        onProductsChange(data)

        // Subscribe to products changes
        const productsChannel = supabase
          .channel('products-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'products',
            },
            (payload) => {
              console.log('📦 Product update:', payload)
              if (isMounted) {
                loadProducts()
              }
            }
          )
          .subscribe()

        subscriptionRef.current = () => supabase.removeChannel(productsChannel)
      } catch (error) {
        console.error('Error setting up product realtime:', error)
      } finally {
        if (isMounted) {
          onLoading(false)
        }
      }
    }

    const loadProducts = async () => {
      try {
        const data = await productService.getAllProducts()
        if (isMounted) {
          onProductsChange(data)
        }
      } catch (error) {
        console.error('Error reloading products:', error)
      }
    }

    setupRealtime()

    // Cleanup
    return () => {
      isMounted = false
      subscriptionRef.current?.()
    }
  }, [])
}
