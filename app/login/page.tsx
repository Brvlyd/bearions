'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authService } from '@/lib/auth'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Check if coming from email confirmation
  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    const emailParam = searchParams.get('email')
    
    if (confirmed === 'true') {
      setSuccess('✅ Email berhasil dikonfirmasi! Silakan login untuk melanjutkan.')
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam))
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(t('login.errorInvalidEmail'))
      return
    }

    // Validate password not empty
    if (!password || password.length < 6) {
      setError(t('login.errorPasswordLength'))
      return
    }

    setLoading(true)

    try {
      // Login tanpa specify role, akan auto-detect
      const result = await authService.login({ email, password })
      
      if (!result) {
        setError(t('login.errorFailed'))
        return
      }
      
      if (result.role === 'admin') {
        router.push('/admin/dashboard')
      } else if (result.role === 'user') {
        router.push('/catalog')
      } else {
        setError(t('login.errorRoleDetermination'))
        await authService.logout()
      }
    } catch (err: any) {
      console.error('Login error:', err)
      
      let errorMessage = t('login.errorFailed')
      
      if (err.message?.includes('EMAIL_NOT_CONFIRMED') || err.message?.includes('Email not confirmed')) {
        errorMessage = '📧 Email belum dikonfirmasi! Silakan cek inbox email Anda dan klik link konfirmasi yang kami kirim. Jika tidak ada, cek folder spam/junk.'
      } else if (err.message?.includes('Invalid login credentials')) {
        errorMessage = '❌ Email atau password salah. Jika Anda baru mendaftar, pastikan sudah konfirmasi email terlebih dahulu.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-bold text-2xl rounded mx-auto mb-4">
              B
            </div>
            <h1 className="text-2xl font-bold text-black">{t('login.title')}</h1>
            <p className="text-gray-600 mt-2">{t('login.subtitle')}</p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6 text-sm">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-black">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                placeholder={t('login.emailPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-black">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                placeholder={t('login.passwordPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary-animated"
            >
              {loading ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-gray-600">
              {t('login.noAccount')}{' '}
              <Link href="/register" className="text-black font-semibold hover:underline">
                {t('login.signUpLink')}
              </Link>
            </p>

            <Link href="/" className="text-sm text-gray-600 hover:text-black block">
              {t('login.backToStore')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
