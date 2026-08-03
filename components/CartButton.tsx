'use client'

import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cartService } from '@/lib/cart'
import { supabase } from '@/lib/supabase'

export default function CartButton() {
  const [cartCount, setCartCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const loadCartCount = async (uid: string) => {
    try {
      const count = await cartService.getCartCount(uid)
      setCartCount(count)
    } catch (error) {
      console.error('Error loading cart count:', error)
    }
  }

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        loadCartCount(data.user.id)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
        loadCartCount(session.user.id)
      } else {
        setUserId(null)
        setCartCount(0)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Quick-add (and anything else that mutates the cart outside /cart) fires this
  // so the badge updates immediately instead of waiting for a remount.
  useEffect(() => {
    if (!userId) return

    const handleCartUpdated = () => {
      loadCartCount(userId)
    }

    window.addEventListener('cart:updated', handleCartUpdated)
    return () => window.removeEventListener('cart:updated', handleCartUpdated)
  }, [userId])

  const handleClick = () => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <Link
      href="/cart"
      onClick={handleClick}
      className={`relative inline-flex p-2.5 rounded-full transition-all duration-200 group hover:bg-white/10 ${
        isAnimating ? 'scale-90' : 'scale-100'
      }`}
    >
      <ShoppingCart className="w-5 h-5 text-white/70 group-hover:text-white transition-colors duration-200" />
      {userId && cartCount > 0 && (
        <span className="absolute top-0 right-0 bg-white text-black text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center ring-2 ring-black">
          {cartCount > 9 ? '9+' : cartCount}
        </span>
      )}
    </Link>
  )
}
