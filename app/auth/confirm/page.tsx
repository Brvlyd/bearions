'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n'

type VerifyState = 'verifying' | 'success' | 'error'

const allowedOtpTypes: EmailOtpType[] = ['signup', 'recovery', 'email_change', 'email']

export default function ConfirmAuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()

  const [state, setState] = useState<VerifyState>('verifying')
  const [message, setMessage] = useState('')

  const nextPath = useMemo(() => {
    const next = searchParams.get('next') || '/login'
    return next.startsWith('/') ? next : '/login'
  }, [searchParams])

  useEffect(() => {
    let mounted = true

    const handleConfirmation = async () => {
      try {
        const code = searchParams.get('code')
        const tokenHash = searchParams.get('token_hash')
        const typeParam = searchParams.get('type')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (tokenHash && typeParam && allowedOtpTypes.includes(typeParam as EmailOtpType)) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: typeParam as EmailOtpType,
          })
          if (error) throw error
        } else {
          throw new Error('Invalid or expired confirmation link.')
        }

        if (!mounted) return

        // We only need account verification here, so clear temporary session and send users to login.
        await supabase.auth.signOut({ scope: 'local' })

        const redirectParams = new URLSearchParams({ confirmed: 'true' })
        const email = searchParams.get('email')
        if (email) {
          redirectParams.set('email', email)
        }

        setState('success')
        setMessage(
          language === 'en'
            ? 'Email confirmed successfully. Redirecting to sign in...'
            : 'Email berhasil dikonfirmasi. Mengarahkan ke halaman login...'
        )

        router.replace(`${nextPath}?${redirectParams.toString()}`)
      } catch (error: unknown) {
        if (!mounted) return

        const message = error instanceof Error ? error.message : String(error ?? '')
        const isExpired = message.toLowerCase().includes('expired')
        setState('error')
        setMessage(
          isExpired
            ? language === 'en'
              ? 'Confirmation link has expired. Please request a new verification email.'
              : 'Link konfirmasi sudah kedaluwarsa. Silakan minta email verifikasi baru.'
            : language === 'en'
              ? 'Failed to confirm email. Please try again from the latest verification email.'
              : 'Gagal mengonfirmasi email. Silakan coba lagi dari email verifikasi terbaru.'
        )
      }
    }

    handleConfirmation()

    return () => {
      mounted = false
    }
  }, [language, nextPath, router, searchParams])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 pt-20 pb-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-bold text-2xl rounded mx-auto mb-4">
            B
          </div>

          {state === 'verifying' && (
            <>
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-black mb-4"></div>
              <h1 className="text-2xl font-bold text-black mb-2">
                {language === 'en' ? 'Verifying your email' : 'Memverifikasi email Anda'}
              </h1>
              <p className="text-gray-600">
                {language === 'en'
                  ? 'Please wait while we confirm your account...'
                  : 'Mohon tunggu, kami sedang mengonfirmasi akun Anda...'}
              </p>
            </>
          )}

          {state !== 'verifying' && (
            <>
              <h1 className="text-2xl font-bold text-black mb-2">
                {state === 'success'
                  ? language === 'en'
                    ? 'Verification successful'
                    : 'Verifikasi berhasil'
                  : language === 'en'
                    ? 'Verification failed'
                    : 'Verifikasi gagal'}
              </h1>

              <p className={`text-sm mb-6 ${state === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {message}
              </p>

              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full px-4 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition"
                >
                  {language === 'en' ? 'Go to Login' : 'Ke Halaman Login'}
                </Link>
                <Link
                  href="/auth/otp"
                  className="block w-full px-4 py-3 rounded-lg border border-black text-black font-medium hover:bg-black hover:text-white transition"
                >
                  {language === 'en' ? 'Resend Verification Email' : 'Kirim Ulang Email Verifikasi'}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
