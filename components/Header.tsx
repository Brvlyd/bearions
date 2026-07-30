'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { User, Menu, X, LogOut, Globe } from 'lucide-react'
import { authService } from '@/lib/auth'
import CartButton from './CartButton'
import { useLanguage } from '@/lib/i18n'
import { useSiteSettings } from './SiteSettingsProvider'
import {
  LOGO_ASPECT_RATIO,
  LOGO_DISPLAY_HEIGHT,
  LOGO_DISPLAY_WIDTH,
  resolveLogoUrl,
} from '@/lib/site-settings'

export default function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [scrolled, setScrolled] = useState(false)
  const { language, setLanguage, t, tr } = useLanguage()
  const siteSettings = useSiteSettings()
  const logoSrc = resolveLogoUrl(siteSettings.logo_url, siteSettings.updated_at)

  const checkAuth = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (user) {
        setIsLoggedIn(true)
        setUserRole(user.role)
        setUserName(user.profile?.full_name || '')
      } else {
        setIsLoggedIn(false)
        setUserRole(null)
        setUserName('')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsLoggedIn(false)
      setUserRole(null)
      setUserName('')
    }
  }

  useEffect(() => {
    // Every setState inside checkAuth runs after an await, so nothing is set
    // synchronously here; the compiler cannot see through the async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth()

    // Listen for auth state changes
    const { data: authListener } = authService.onAuthStateChange((event) => {
      console.log('Auth state changed:', event)
      checkAuth()
    })

    // Detect scroll for header effect
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [])

  const handleLogout = async () => {
    try {
      await authService.logout()
      setIsLoggedIn(false)
      setUserRole(null)
      setUserName('')
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'id' : 'en')
  }

  // Don't render header on admin pages
  if (pathname?.startsWith('/admin')) {
    return null
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-black/95 backdrop-blur-lg shadow-lg' : 'bg-black'
    } text-white border-b border-white/10`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo — image only, editable from Admin > Site Settings. The box is
              fixed to the bundled mark's dimensions so any uploaded logo is
              contained in the same slot and the header never reflows.
              The bundled mark is black artwork and this bar is black, so the
              logo sits on a light plate to stay legible — that also holds for
              whatever colour an uploaded replacement happens to be. */}
          <Link
            href="/"
            className="flex items-center group shrink-0"
            aria-label={siteSettings.site_title}
          >
            <span className="flex items-center justify-center rounded-xl bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-white/25 transition-transform duration-300 group-hover:scale-105">
              <Image
                src={logoSrc}
                alt={siteSettings.site_title}
                width={LOGO_DISPLAY_WIDTH}
                height={LOGO_DISPLAY_HEIGHT}
                style={{ aspectRatio: LOGO_ASPECT_RATIO }}
                className="h-9 w-auto object-contain"
                priority
              />
            </span>
          </Link>

          {/* Desktop Navigation with modern hover effects. Below lg the links
              plus the account buttons no longer fit beside the logo, so the
              whole set collapses into the mobile menu instead of overlapping. */}
          <nav className="hidden lg:flex items-center space-x-1">
            <Link 
              href="/catalog" 
              className="px-4 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-105 relative group"
            >
              <span className="relative z-10">{t('nav.catalog')}</span>
              <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/5 to-white/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </Link>
            <Link 
              href="/community" 
              className="px-4 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-105 relative group"
            >
              <span className="relative z-10">{t('nav.community')}</span>
              <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/5 to-white/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </Link>
            <Link
              href="/about"
              className="px-4 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-105 relative group"
            >
              <span className="relative z-10">{t('nav.about')}</span>
              <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/5 to-white/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </Link>
            <Link
              href="/contact"
              className="px-4 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-105 relative group"
            >
              <span className="relative z-10">{t('nav.contact')}</span>
              <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/5 to-white/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </Link>
          </nav>

          {/* Right Side with enhanced animations */}
          <div className="hidden lg:flex items-center space-x-2 shrink-0">
            {/* Cart Button with pulse animation */}
            <CartButton />
            
            {/* Language Switcher with smooth transition */}
            <button
              onClick={toggleLanguage}
              className="header-btn-language text-sm group shrink-0"
              title={language === 'en' ? tr('Switch to Indonesian', 'Ganti ke Bahasa Indonesia') : tr('Switch to English', 'Ganti ke English')}
            >
              <Globe className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
              <span className="font-medium min-w-6 text-center">{language === 'en' ? 'EN' : 'ID'}</span>
            </button>
            
            {isLoggedIn ? (
              <>
                <Link 
                  href={userRole === 'admin' ? '/admin/dashboard' : '/profile'}
                  className="header-btn-icon group max-w-xs"
                  title={userName ? `${tr('Hello', 'Halo')}, ${userName}` : ''}
                >
                  <User className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 shrink-0" />
                  <span className="font-medium truncate">
                    {userName ? (
                      <>
                        <span className="hidden xl:inline">{tr('Hello', 'Halo')}, </span>
                        <span className="hidden xl:inline">{userName.length > 12 ? userName.substring(0, 12) + '...' : userName}</span>
                        <span className="xl:hidden">{userName.split(' ')[0]}</span>
                      </>
                    ) : (
                      userRole === 'admin' ? t('nav.dashboard') : t('nav.profile')
                    )}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="header-btn-logout group shrink-0"
                >
                  <LogOut className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  <span className="font-medium">{t('nav.logout')}</span>
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="header-btn-icon group shrink-0"
                >
                  <User className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  <span className="font-medium">{t('nav.signIn')}</span>
                </Link>
                <Link
                  href="/register"
                  className="header-btn-primary font-medium shrink-0"
                >
                  {t('nav.signUp')}
                </Link>
              </>
            )}
            
          </div>

          {/* Mobile: keep the cart (and its item count) reachable in one tap
              instead of hiding it behind the menu */}
          <div className="flex items-center gap-1 lg:hidden">
            <CartButton />
            <button
              className="p-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-110"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? tr('Close menu', 'Tutup menu') : tr('Open menu', 'Buka menu')}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation with slide animation */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ${
          mobileMenuOpen ? 'max-h-128 opacity-100 pb-4' : 'max-h-0 opacity-0'
        }`}>
          <div className="pt-4 space-y-2">
            <Link 
              href="/catalog" 
              className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.catalog')}
            </Link>
            <Link 
              href="/community" 
              className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.community')}
            </Link>
            <Link
              href="/about"
              className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.about')}
            </Link>
            <Link
              href="/contact"
              className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.contact')}
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
                  {userName ? (
                    <span>{tr('Hello', 'Halo')}, {userName.split(' ')[0]}</span>
                  ) : (
                    userRole === 'admin' ? t('nav.dashboard') : t('nav.profile')
                  )}
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
          </div>
        </div>
      </div>
    </header>
  )
}
