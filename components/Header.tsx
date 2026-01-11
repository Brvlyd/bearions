'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { User, Menu, X, LogOut, Globe, ShoppingBag } from 'lucide-react'
import { authService } from '@/lib/auth'
import CartButton from './CartButton'
import { useLanguage } from '@/lib/i18n'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const { language, setLanguage, t } = useLanguage()

  useEffect(() => {
    checkAuth()
    
    // Detect scroll for header effect
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
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

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'id' : 'en')
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-black/95 backdrop-blur-lg shadow-lg' : 'bg-black'
    } text-white border-b border-white/10`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo with hover effect */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-bold text-xl rounded transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg">
              B
            </div>
            <span className="text-xl font-bold transition-all duration-300 group-hover:text-gray-300">BEARIONS</span>
          </Link>

          {/* Desktop Navigation with modern hover effects */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link 
              href="/catalog" 
              className="px-4 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-105 relative group"
            >
              <span className="relative z-10">{t('nav.catalog')}</span>
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </Link>
            {isLoggedIn && (
              <Link 
                href="/orders" 
                className="px-4 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-105 relative group"
              >
                <span className="relative z-10">{t('nav.myOrders')}</span>
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              </Link>
            )}
            <Link 
              href="/community" 
              className="px-4 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-105 relative group"
            >
              <span className="relative z-10">{t('nav.community')}</span>
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </Link>
          </nav>

          {/* Right Side with enhanced animations */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Cart Button with pulse animation */}
            <div className="relative">
              <CartButton />
            </div>
            
            {/* Language Switcher with smooth transition */}
            <button
              onClick={toggleLanguage}
              className="header-btn-language text-sm group"
              title={language === 'en' ? 'Switch to Indonesian' : 'Ganti ke English'}
            >
              <Globe className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
              <span className="font-medium min-w-[1.5rem] text-center">{language === 'en' ? 'EN' : 'ID'}</span>
            </button>
            
            {isLoggedIn ? (
              <>
                <Link 
                  href={userRole === 'admin' ? '/admin/dashboard' : '/profile'}
                  className="header-btn-icon group"
                >
                  <User className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  <span className="font-medium">{userRole === 'admin' ? t('nav.dashboard') : t('nav.profile')}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="header-btn-logout group"
                >
                  <LogOut className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  <span className="font-medium">{t('nav.logout')}</span>
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="header-btn-icon group"
                >
                  <User className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  <span className="font-medium">{t('nav.signIn')}</span>
                </Link>
                <Link
                  href="/register"
                  className="header-btn-primary font-medium"
                >
                  {t('nav.signUp')}
                </Link>
              </>
            )}
            
            <Link
              href="/contact"
              className="header-btn-primary font-medium"
            >
              {t('nav.contact')}
            </Link>
          </div>

          {/* Mobile menu button with animation */}
          <button
            className="md:hidden p-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-110"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation with slide animation */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${
          mobileMenuOpen ? 'max-h-96 opacity-100 pb-4' : 'max-h-0 opacity-0'
        }`}>
          <div className="pt-4 space-y-2">
            <Link 
              href="/catalog" 
              className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.catalog')}
            </Link>
            {isLoggedIn && (
              <Link 
                href="/orders" 
                className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.myOrders')}
              </Link>
            )}
            <Link 
              href="/community" 
              className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.community')}
            </Link>
            <Link 
              href="/cart" 
              className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.cart')}
            </Link>
            
            {/* Mobile Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 w-full px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              <Globe className="w-4 h-4" />
              <span>{language === 'en' ? 'English' : 'Bahasa Indonesia'}</span>
            </button>
            
            {isLoggedIn ? (
              <>
                <Link 
                  href={userRole === 'admin' ? '/admin/dashboard' : '/profile'}
                  className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {userRole === 'admin' ? t('nav.dashboard') : t('nav.profile')}
                </Link>
                <button 
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }} 
                  className="block w-full text-left px-4 py-2 rounded-lg hover:bg-red-600/20 hover:text-red-400 transition-all duration-200"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.signIn')}
                </Link>
                <Link 
                  href="/register" 
                  className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.signUp')}
                </Link>
              </>
            )}
            <Link 
              href="/contact" 
              className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.contact')}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
