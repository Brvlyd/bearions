'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ShoppingCart, User, Menu, X } from 'lucide-react'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
            <Link 
              href="/admin/login" 
              className="hover:text-gray-300 transition flex items-center space-x-1"
            >
              <User className="w-4 h-4" />
              <span>Sign in</span>
            </Link>
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
            <Link href="/admin/login" className="block hover:text-gray-300">
              Sign in
            </Link>
            <Link href="/contact" className="block hover:text-gray-300">
              Contact Us
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
