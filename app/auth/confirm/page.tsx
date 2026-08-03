'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authService, getDashboardPath } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'
import LoadingSpinner from '@/components/LoadingSpinner'

type VerifyState = 'verifying' | 'success' | 'error'

const allowedOtpTypes: EmailOtpType[] = ['signup', 'recovery', 'email_change', 'email']

/** How long the success screen stays up before the redirect fires. */
const REDIRECT_DELAY_SECONDS = 3

function ConfirmAuthContent() {
  const searchParams = useSearchParams()
  const { language } = useLanguage()

  const [state, setState] = useState<VerifyState>('verifying')
  const [message, setMessage] = useState('')
  const [destination, setDestination] = useState('/catalog')
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS)

  // supabase.ts runs with detectSessionInUrl, so the client strips the token
  // fragment as soon as it has consumed it. Snapshot the hash on first render,
  // before that cleanup can win the race, or a valid link can look malformed.
  const [initialHash] = useState(() =>
    typeof window !== 'undefined' ? window.location.hash : ''
  )

  // A full reload, not router.push: the header and every cached server component
  // still believe the visitor is signed out until the document is re-requested.
  const goToDestination = useCallback((path: string) => {
    window.location.href = path
  }, [])

  // An explicit ?next= wins, otherwise the account's own dashboard decides.
  const requestedNext = useMemo(() => {
    const next = searchParams.get('next')
    // Only same-origin paths — an absolute URL here would be an open redirect.
    return next && next.startsWith('/') && !next.startsWith('//') ? next : null
  }, [searchParams])

  const loginFallbackUrl = useMemo(() => {
    const params = new URLSearchParams({ confirmed: 'true' })
    const email = searchParams.get('email')
    if (email) params.set('email', email)

    return `/login?${params.toString()}`
  }, [searchParams])

  const startedRef = useRef(false)

  useEffect(() => {
    // Under StrictMode this effect runs twice; redeeming a one-time token twice
    // would fail the second attempt and overwrite a success with an error.
    if (startedRef.current) return
    startedRef.current = true

    let mounted = true

    const handleConfirmation = async () => {
      try {
        const hashParams = new URLSearchParams(initialHash.replace(/^#/, ''))

        // Supabase reports a refused link on the redirect itself, in either the
        // query or the fragment depending on the flow.
        const linkError =
          searchParams.get('error_description') ||
          searchParams.get('error') ||
          hashParams.get('error_description') ||
          hashParams.get('error')

        if (linkError) {
          const errorCode = searchParams.get('error_code') || hashParams.get('error_code') || ''
          throw new Error(`${errorCode} ${linkError}`)
        }

        const code = searchParams.get('code')
        const tokenHash = searchParams.get('token_hash')
        const typeParam = searchParams.get('type')
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          // Implicit flow: the tokens ride in the fragment, already verified.
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (tokenHash && typeParam && allowedOtpTypes.includes(typeParam as EmailOtpType)) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: typeParam as EmailOtpType,
          })
          if (error) throw error
        } else if (!(await authService.getSessionSafely())) {
          // No credentials in the URL and nothing already signed in: the link
          // was truncated, reused, or opened by hand.
          throw new Error('Invalid or expired confirmation link.')
        }

        if (!mounted) return

        // The session the confirmation just produced is kept on purpose — that
        // is what lets the visitor land on the dashboard already signed in
        // instead of being asked for the password they typed minutes ago.
        const session = await authService.getSessionSafely()

        if (!mounted) return

        if (!session?.user) {
          // Verified, but this browser holds no usable session — happens when
          // the mail is opened somewhere the signup never ran. Send them to
          // login rather than to a dashboard that would bounce them back.
          setState('success')
          setMessage(
            language === 'en'
              ? 'Email confirmed successfully. Redirecting to sign in...'
              : 'Email berhasil dikonfirmasi. Mengarahkan ke halaman login...'
          )
          setDestination(loginFallbackUrl)
          return
        }

        // A signed-in visitor whose profile row is still missing is sent to the
        // customer dashboard anyway — the session is real, and bouncing them to
        // login would only strand them on a form they cannot get past.
        const account = await authService.getUserWithRole(session.user)

        if (!mounted) return

        setState('success')
        setMessage(
          language === 'en'
            ? 'Your email is verified and you are signed in. Taking you to your dashboard...'
            : 'Email Anda terverifikasi dan Anda sudah masuk. Mengarahkan ke dashboard...'
        )
        setDestination(requestedNext ?? getDashboardPath(account?.role))
      } catch (error: unknown) {
        if (!mounted) return

        const message = error instanceof Error ? error.message : String(error ?? '')
        const normalized = message.toLowerCase()
        const isExpired = normalized.includes('expired') || normalized.includes('otp_expired')
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
  }, [initialHash, language, loginFallbackUrl, requestedNext, searchParams])

  // Success screen first, redirect second, so the confirmation is actually read.
  useEffect(() => {
    if (state !== 'success') return

    if (countdown <= 0) {
      goToDestination(destination)
      return
    }

    const timer = window.setTimeout(() => setCountdown((prev) => prev - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown, destination, goToDestination, state])

  const isLoginFallback = destination.startsWith('/login')

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 pt-20 pb-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-bold text-2xl rounded mx-auto mb-4">
            B
          </div>

          {state === 'verifying' && (
            <>
              <LoadingSpinner padded={false} className="mb-4" />
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

          {state === 'success' && (
            <>
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-3xl mx-auto mb-4">
                ✓
              </div>
              <h1 className="text-2xl font-bold text-black mb-2">
                {language === 'en' ? 'Verification successful' : 'Verifikasi berhasil'}
              </h1>

              <p className="text-sm text-green-700 mb-2">{message}</p>
              <p className="text-xs text-gray-500 mb-6">
                {language === 'en'
                  ? `Redirecting in ${countdown}s`
                  : `Mengarahkan dalam ${countdown} detik`}
              </p>

              <button
                type="button"
                onClick={() => goToDestination(destination)}
                className="block w-full px-4 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition"
              >
                {isLoginFallback
                  ? language === 'en'
                    ? 'Go to Login'
                    : 'Ke Halaman Login'
                  : language === 'en'
                    ? 'Continue to Dashboard'
                    : 'Lanjut ke Dashboard'}
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <h1 className="text-2xl font-bold text-black mb-2">
                {language === 'en' ? 'Verification failed' : 'Verifikasi gagal'}
              </h1>

              <p className="text-sm mb-6 text-red-700">{message}</p>

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

export default function ConfirmAuthPage() {
  const { tr } = useLanguage()
  return (
    <Suspense fallback={<LoadingSpinner fullScreen label={tr('Loading...', 'Memuat...')} />}>
      <ConfirmAuthContent />
    </Suspense>
  )
}
