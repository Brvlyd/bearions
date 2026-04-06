'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authService } from '@/lib/auth'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
    const { t, language } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // Check if coming from email confirmation
  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    const emailParam = searchParams.get('email')
    const reset = searchParams.get('reset')
    const resetError = searchParams.get('reset_error')

    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
    
    if (confirmed === 'true') {
        setSuccess(
          language === 'en'
            ? '✅ Email confirmed successfully! Please sign in to continue.'
            : '✅ Email berhasil dikonfirmasi! Silakan login untuk melanjutkan.'
        )
    }

    if (reset === 'success') {
        setSuccess(
          language === 'en'
            ? '✅ Password updated successfully! Please login with your new password.'
            : '✅ Password berhasil diubah! Silakan login dengan password baru Anda.'
        )
    }

    if (resetError === 'expired') {
        setError(
          language === 'en'
            ? '❌ Password reset link is invalid or expired. Please request a new reset link.'
            : '❌ Link reset password sudah tidak valid atau sudah kadaluarsa. Silakan kirim ulang link reset password.'
        )
    }
  }, [searchParams])

  const isValidEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate email format
    if (!isValidEmail(email)) {
      setError(t('login.errorInvalidEmail'))
      return
    }

    // Validate password not empty
    if (!password || password.length < 6) {
      setError(t('login.errorPasswordLength'))
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Login tanpa specify role, akan auto-detect
      const result = await authService.login({ email, password })
      
      if (!result) {
        setError(t('login.errorFailed'))
        setLoading(false)
        return
      }
      
      // Show success message
      setRedirecting(true)
        setSuccess(
          language === 'en'
            ? '✅ Login successful! Redirecting...'
            : '✅ Login berhasil! Mengarahkan ke halaman...'
        )
      
      // Wait a bit to ensure session is properly saved
      await new Promise(resolve => setTimeout(resolve, 800))
      
      if (result.role === 'admin') {
        window.location.href = '/admin/dashboard'
      } else if (result.role === 'user') {
        window.location.href = '/catalog'
      } else {
        setError(t('login.errorRoleDetermination'))
        await authService.logout()
        setLoading(false)
        setRedirecting(false)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      
      let errorMessage = t('login.errorFailed')
      
      if (err.message?.includes('EMAIL_NOT_CONFIRMED') || err.message?.includes('Email not confirmed')) {
        const encodedEmail = encodeURIComponent(email.trim().toLowerCase())
        router.push(`/auth/otp?email=${encodedEmail}&source=login`)
        return
      } else if (err.message?.includes('Invalid login credentials')) {
          errorMessage =
            language === 'en'
              ? '❌ Invalid email or password. If you just registered, make sure your email has been verified first.'
              : '❌ Email atau password salah. Jika Anda baru mendaftar, pastikan sudah konfirmasi email terlebih dahulu.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSendResetPassword = async () => {
    setError('')
    setSuccess('')

    if (!isValidEmail(email)) {
        setError(
          language === 'en'
            ? '🔑 Please enter a valid email first to reset password.'
            : '🔑 Masukkan email yang valid terlebih dahulu untuk reset password.'
        )
      return
    }

    try {
      setResetLoading(true)
      await authService.sendPasswordResetEmail(email.trim().toLowerCase())
        setSuccess(
          language === 'en'
            ? '📩 Password reset link has been sent. Please check your inbox and spam/junk folder.'
            : '📩 Link reset password sudah dikirim. Silakan cek inbox dan folder spam/junk.'
        )
    } catch (err: any) {
      console.error('Reset password email error:', err)
        const message =
          err?.message ||
          (language === 'en' ? 'Failed to send reset password email.' : 'Gagal mengirim email reset password.')
      setError(`❌ ${message}`)
    } finally {
      setResetLoading(false)
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
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-black">
                  {t('login.password')}
                </label>
                <button
                  type="button"
                  onClick={handleSendResetPassword}
                  disabled={resetLoading}
                  className="text-xs text-black hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                    {resetLoading
                      ? (language === 'en' ? 'Sending...' : 'Mengirim...')
                      : (language === 'en' ? 'Forgot password?' : 'Lupa password?')}
                </button>
              </div>
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
              disabled={loading || redirecting || resetLoading}
              className="w-full btn-primary-animated"
            >
                {redirecting
                  ? (language === 'en' ? '🔄 Redirecting...' : '🔄 Mengarahkan...')
                  : (loading ? t('login.submitting') : t('login.submit'))}
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
