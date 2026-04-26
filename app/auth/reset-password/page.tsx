'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { language } = useLanguage()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [canReset, setCanReset] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let mounted = true

    const authListener = authService.onAuthStateChange((event, session) => {
      if (!mounted) return

      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session?.user) {
        setCanReset(true)
        setCheckingSession(false)
      }
    })

    const verifyRecoverySession = async () => {
      try {
        const session = await authService.getSession()
        if (!mounted) return

        if (session?.user) {
          setCanReset(true)
        }
      } catch {
        if (!mounted) return
        setError(language === 'en' ? 'Failed to validate reset session.' : 'Gagal memvalidasi sesi reset password.')
      } finally {
        if (mounted) {
          setCheckingSession(false)
        }
      }
    }

    verifyRecoverySession()

    return () => {
      mounted = false
      authListener.data.subscription.unsubscribe()
    }
  }, [language])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 6) {
      setError(language === 'en' ? 'Password must be at least 6 characters.' : 'Kata sandi minimal 6 karakter.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError(language === 'en' ? 'Password confirmation does not match.' : 'Konfirmasi kata sandi tidak cocok.')
      return
    }

    try {
      setLoading(true)
      await authService.updatePassword(newPassword)
      setSuccess(language === 'en' ? 'Password updated successfully. Redirecting to login...' : 'Password berhasil diubah. Mengarahkan ke login...')

      try {
        await authService.logout()
      } catch {
        // no-op
      }

      setTimeout(() => {
        router.push('/login?reset=success')
      }, 1200)
    } catch (err: any) {
      console.error('Reset password error:', err)
      setError(
        err?.message ||
          (language === 'en'
            ? 'Failed to update password. Please request a new reset link.'
            : 'Gagal mengubah password. Silakan minta link reset baru.')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 pt-20 pb-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-bold text-2xl rounded mx-auto mb-4">
              B
            </div>
            <h1 className="text-2xl font-bold text-black">
              {language === 'en' ? 'Reset Password' : 'Reset Kata Sandi'}
            </h1>
            <p className="text-gray-600 mt-2">
              {language === 'en'
                ? 'Set your new Bearions account password.'
                : 'Atur kata sandi baru untuk akun Bearions Anda.'}
            </p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6 text-sm">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm">
              {error}
            </div>
          )}

          {checkingSession ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
              <p className="text-sm text-gray-600 mt-3">
                {language === 'en' ? 'Validating recovery session...' : 'Memvalidasi sesi pemulihan...'}
              </p>
            </div>
          ) : canReset ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium mb-2 text-black">
                  {language === 'en' ? 'New Password' : 'Kata Sandi Baru'}
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                  placeholder={language === 'en' ? 'At least 6 characters' : 'Minimal 6 karakter'}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-black">
                  {language === 'en' ? 'Confirm New Password' : 'Konfirmasi Kata Sandi Baru'}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                  placeholder={language === 'en' ? 'Repeat your password' : 'Ulangi kata sandi Anda'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary-animated"
              >
                {loading
                  ? (language === 'en' ? 'Saving...' : 'Menyimpan...')
                  : (language === 'en' ? 'Save New Password' : 'Simpan Password Baru')}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-700 mb-4">
                {language === 'en'
                  ? 'Reset link is invalid or expired. Please request a new reset email from login page.'
                  : 'Link reset tidak valid atau sudah kadaluarsa. Silakan minta email reset baru dari halaman login.'}
              </p>
              <button
                type="button"
                onClick={() => router.push('/login?reset_error=expired')}
                className="w-full px-4 py-3 border border-black rounded-lg text-black font-medium hover:bg-black hover:text-white transition"
              >
                {language === 'en' ? 'Back to Login' : 'Kembali ke Login'}
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-gray-600 hover:text-black">
              {language === 'en' ? '← Back to sign in' : '← Kembali ke halaman login'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
