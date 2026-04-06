'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'

export default function OtpVerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
  }, [searchParams])

  useEffect(() => {
    if (cooldown <= 0) return

    const timer = window.setTimeout(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [cooldown])

  const isValidEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const handleResendOtp = async () => {
    setError('')
    setSuccess('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      setError(language === 'en' ? 'Please enter a valid email address.' : 'Masukkan alamat email yang valid.')
      return
    }

    try {
      setLoading(true)
      await authService.resendEmailVerification(normalizedEmail)
      setSuccess(
        language === 'en'
          ? 'Verification email sent. Please check your inbox and spam folder.'
          : 'Email verifikasi sudah dikirim ulang. Cek inbox dan folder spam/junk Anda.'
      )
      setCooldown(45)
    } catch (err: any) {
      console.error('Resend OTP error:', err)
      setError(
        err?.message ||
          (language === 'en' ? 'Failed to resend verification email.' : 'Gagal mengirim ulang email verifikasi.')
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
              {language === 'en' ? 'Email Verification' : 'Verifikasi Email'}
            </h1>
            <p className="text-gray-600 mt-2 text-sm">
              {language === 'en'
                ? 'Verification is required before you can login.'
                : 'Verifikasi email wajib sebelum Anda bisa login.'}
            </p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-black">
                {language === 'en' ? 'Email' : 'Email'}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                placeholder={language === 'en' ? 'you@example.com' : 'anda@contoh.com'}
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p>1. {language === 'en' ? 'Open your inbox (and spam folder).' : 'Buka inbox email Anda (termasuk folder spam/junk).'}</p>
              <p>2. {language === 'en' ? 'Click the verification link from Bearions.' : 'Klik link verifikasi dari Bearions.'}</p>
              <p>3. {language === 'en' ? 'After verified, return and login.' : 'Setelah terverifikasi, kembali lalu login.'}</p>
            </div>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading || cooldown > 0}
              className="w-full px-4 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading
                ? (language === 'en' ? 'Sending...' : 'Mengirim...')
                : cooldown > 0
                  ? (language === 'en' ? `Resend in ${cooldown}s` : `Kirim ulang dalam ${cooldown} detik`)
                  : (language === 'en' ? 'Resend Verification Email' : 'Kirim Ulang Email Verifikasi')}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/login?email=${encodeURIComponent(email.trim())}`)}
              className="w-full px-4 py-3 rounded-lg border border-black text-black font-medium hover:bg-black hover:text-white transition"
            >
              {language === 'en' ? 'I Have Verified, Continue to Login' : 'Saya Sudah Verifikasi, Lanjut Login'}
            </button>
          </div>

          <div className="mt-6 text-center space-y-2">
            <Link href="/register" className="text-sm text-gray-600 hover:text-black block">
              {language === 'en' ? '← Back to register' : '← Kembali ke daftar'}
            </Link>
            <Link href="/" className="text-sm text-gray-600 hover:text-black block">
              {language === 'en' ? '← Back to store' : '← Kembali ke toko'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
