'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authService } from '@/lib/auth'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'

function LoginPageContent() {
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
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationCooldown, setVerificationCooldown] = useState(0)
  const [showVerificationActions, setShowVerificationActions] = useState(false)

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
  }, [language, searchParams])

  useEffect(() => {
    if (verificationCooldown <= 0) return

    const timer = window.setTimeout(() => {
      setVerificationCooldown((prev) => prev - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [verificationCooldown])

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
    setShowVerificationActions(false)

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
    } catch (err: unknown) {
      console.error('Login error:', err)
      const errMessage = err instanceof Error ? err.message : String(err ?? '')
      
      let errorMessage = t('login.errorFailed')
      
      if (errMessage.includes('EMAIL_NOT_CONFIRMED') || errMessage.includes('Email not confirmed')) {
        setError(
          language === 'en'
            ? '❌ Your email is not verified yet. Click resend verification below, then open the latest email.'
            : '❌ Email Anda belum diverifikasi. Klik kirim ulang verifikasi di bawah, lalu buka email terbaru.'
        )
        setShowVerificationActions(true)
        return
      } else if (errMessage.includes('Invalid login credentials')) {
          errorMessage =
            language === 'en'
              ? '❌ Invalid email or password. If you just registered, make sure your email has been verified first.'
              : '❌ Email atau password salah. Jika Anda baru mendaftar, pastikan sudah konfirmasi email terlebih dahulu.'
          setShowVerificationActions(true)
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setError('')
    setSuccess('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      setError(
        language === 'en'
          ? '📩 Enter a valid email first, then resend verification.'
          : '📩 Masukkan email yang valid terlebih dahulu, lalu kirim ulang verifikasi.'
      )
      return
    }

    if (verificationCooldown > 0) return

    try {
      setVerificationLoading(true)
      await authService.resendEmailVerification(normalizedEmail)
      setSuccess(
        language === 'en'
          ? '✅ Verification email sent again. Please check inbox and spam/junk folder.'
          : '✅ Email verifikasi sudah dikirim ulang. Silakan cek inbox dan folder spam/junk.'
      )
      setVerificationCooldown(45)
      setShowVerificationActions(true)
    } catch (err: unknown) {
      console.error('Resend verification error:', err)
      const errMessage = err instanceof Error ? err.message : String(err ?? '')
      setError(
        errMessage ||
          (language === 'en'
            ? 'Failed to resend verification email. Please try again.'
            : 'Gagal mengirim ulang email verifikasi. Silakan coba lagi.')
      )
    } finally {
      setVerificationLoading(false)
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
    } catch (err: unknown) {
      console.error('Reset password email error:', err)
        const message =
          (err instanceof Error ? err.message : String(err ?? '')) ||
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
              disabled={loading || redirecting || resetLoading || verificationLoading}
              className="w-full btn-primary-animated"
            >
                {redirecting
                  ? (language === 'en' ? '🔄 Redirecting...' : '🔄 Mengarahkan...')
                  : (loading ? t('login.submitting') : t('login.submit'))}
            </button>
          </form>

          {showVerificationActions && (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={verificationLoading || verificationCooldown > 0 || loading || resetLoading}
                className="w-full px-4 py-3 rounded-lg border border-black text-black font-medium hover:bg-black hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {verificationLoading
                  ? (language === 'en' ? 'Sending verification...' : 'Mengirim verifikasi...')
                  : verificationCooldown > 0
                    ? (language === 'en' ? `Resend in ${verificationCooldown}s` : `Kirim ulang dalam ${verificationCooldown} detik`)
                    : (language === 'en' ? 'Resend Verification Email' : 'Kirim Ulang Email Verifikasi')}
              </button>

              <button
                type="button"
                onClick={() => router.push(`/auth/otp?email=${encodeURIComponent(email.trim().toLowerCase())}&source=login`)}
                className="w-full px-4 py-3 rounded-lg text-sm text-black hover:underline"
              >
                {language === 'en' ? 'Open verification help page' : 'Buka halaman bantuan verifikasi'}
              </button>
            </div>
          )}

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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center px-4 pt-16">
          <div className="w-full max-w-md">
            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-black mb-4"></div>
              <h1 className="text-2xl font-bold text-black mb-2">Loading...</h1>
            </div>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
