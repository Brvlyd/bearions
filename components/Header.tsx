'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ShoppingCart, User, Menu, X, LogOut } from 'lucide-react'
import { authService } from '@/lib/auth'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (user) {
        setIsLoggedIn(true)
        setUserRole(user.role)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
      setIsLoggedIn(false)
      setUserRole(null)
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <header className="bg-black text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-bold text-xl rounded">
              B
            </div>
            <span className="text-xl font-bold">BEARIONS</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/catalog" className="hover:text-gray-300 transition">
              Catalog
            </Link>
            <Link href="/community" className="hover:text-gray-300 transition">
              Community
            </Link>
          </nav>

          {/* Right Side */}
          <div className="hidden md:flex items-center space-x-6">
            <button className="hover:text-gray-300 transition">
              <ShoppingCart className="w-5 h-5" />
            </button>
            <select className="bg-black border border-white/20 rounded px-3 py-1 text-sm">
              <option>English (US)</option>
              <option>Bahasa Indonesia</option>
            </select>
            
            {isLoggedIn ? (
              <>
                <Link 
                  href={userRole === 'admin' ? '/admin/dashboard' : '/profile'}
                  className="hover:text-gray-300 transition flex items-center space-x-1"
                >
                  <User className="w-4 h-4" />
                  <span>{userRole === 'admin' ? 'Dashboard' : 'Profile'}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="hover:text-gray-300 transition flex items-center space-x-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="hover:text-gray-300 transition flex items-center space-x-1"
                >
                  <User className="w-4 h-4" />
                  <span>Sign in</span>
                </Link>
                <Link
                  href="/register"
                  className="border border-white px-4 py-2 rounded hover:bg-white hover:text-black transition"
                >
                  Sign up
                </Link>
              </>
            )}
            
            <Link
              href="/contact"
              className="border border-white px-4 py-2 rounded hover:bg-white hover:text-black transition"
            >
              Contact Us
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-4">
            <Link href="/catalog" className="block hover:text-gray-300">
              Catalog
            </Link>
            <Link href="/community" className="block hover:text-gray-300">
              Community
            </Link>
            {isLoggedIn ? (
              <>
                <Link 
                  href={userRole === 'admin' ? '/admin/dashboard' : '/profile'}
                  className="block hover:text-gray-300"
                >
                  {userRole === 'admin' ? 'Dashboard' : 'Profile'}
                </Link>
                <button onClick={handleLogout} className="block hover:text-gray-300 w-full text-left">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block hover:text-gray-300">
                  Sign in
                </Link>
                <Link href="/register" className="block hover:text-gray-300">
                  Sign up
                </Link>
              </>
            )}
            <Link href="/contact" className="block hover:text-gray-300">
              Contact Us
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
