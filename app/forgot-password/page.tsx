'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const { language } = useLanguage()

  const [email, setEmail] = useState(() => {
    const fromQuery = searchParams.get('email')
    return fromQuery ? decodeURIComponent(fromQuery) : ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notRegistered, setNotRegistered] = useState(false)
  const [sent, setSent] = useState(false)

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotRegistered(false)

    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      setError(
        language === 'en'
          ? 'Please enter a valid email address.'
          : 'Masukkan alamat email yang valid.'
      )
      return
    }

    try {
      setLoading(true)
      await authService.sendPasswordResetEmail(normalizedEmail, language)
      setSent(true)
    } catch (err: unknown) {
      const rawMessage =
        (err instanceof Error ? err.message : String(err ?? '')) ||
        (language === 'en'
          ? 'Failed to send reset password email.'
          : 'Gagal mengirim email reset password.')

      if (rawMessage.includes('NOT_REGISTERED')) {
        setNotRegistered(true)
        setError(rawMessage.replace('NOT_REGISTERED:', '').trim())
      } else {
        setError(rawMessage)
      }
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
              {language === 'en' ? 'Forgot Password' : 'Lupa Kata Sandi'}
            </h1>
            <p className="text-gray-600 mt-2">
              {language === 'en'
                ? 'Enter your account email. We will only send the reset link after you press the button below.'
                : 'Masukkan email akun Anda. Link reset baru akan dikirim setelah Anda menekan tombol di bawah.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm">
              <p>{error}</p>
              {notRegistered && (
                <Link href="/register" className="inline-block mt-2 font-medium underline">
                  {language === 'en' ? 'Create an account' : 'Daftar akun'}
                </Link>
              )}
            </div>
          )}

          {sent ? (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6 text-sm">
                {language === 'en'
                  ? 'If that email is registered, we have sent a password reset link. Please check your inbox and spam/junk folder.'
                  : 'Jika email tersebut terdaftar, link reset password sudah kami kirim. Silakan cek inbox dan folder spam/junk.'}
              </div>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-sm text-black hover:underline py-2 px-1"
              >
                {language === 'en' ? 'Send to a different email' : 'Kirim ke email lain'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-black">
                  {language === 'en' ? 'Email' : 'Email'}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                  placeholder={language === 'en' ? 'you@example.com' : 'nama@email.com'}
                />
              </div>

              <button type="submit" disabled={loading} className="w-full btn-primary-animated">
                {loading
                  ? (language === 'en' ? 'Sending...' : 'Mengirim...')
                  : (language === 'en' ? 'Send Reset Email' : 'Kirim Email Reset')}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-gray-600 hover:text-black inline-block py-3 px-1">
              {language === 'en' ? '← Back to sign in' : '← Kembali ke halaman login'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  const { tr } = useLanguage()
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center px-4 pt-20 pb-12">
          <div className="w-full max-w-md">
            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-black mb-4"></div>
              <h1 className="text-2xl font-bold text-black mb-2">{tr('Loading...', 'Memuat...')}</h1>
            </div>
          </div>
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  )
}
