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

  const loadCartCount = async (uid: string) => {
    try {
      const count = await cartService.getCartCount(uid)
      setCartCount(count)
    } catch (error) {
      console.error('Error loading cart count:', error)
    }
  }

  const handleClick = () => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
  }

  if (!userId) return null

  return (
    <Link
      href="/cart"
      onClick={handleClick}
      className={`relative inline-flex p-3 rounded-full transition-all duration-300 group hover:bg-white/20 hover:shadow-lg ${
        isAnimating ? 'scale-90' : 'scale-100'
      }`}
    >
      <ShoppingCart className="w-5 h-5 text-white group-hover:text-white transition-all duration-300 group-hover:scale-110" />
      {cartCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-white text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-black transition-all duration-300 group-hover:scale-110">
          {cartCount > 9 ? '9+' : cartCount}
        </span>
      )}
    </Link>
  )
}
