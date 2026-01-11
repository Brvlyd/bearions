'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    address: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError(t('register.errorInvalidEmail') || 'Please enter a valid email')
      return
    }

    // Validate required fields
    if (!formData.full_name.trim()) {
      setError(t('register.errorNameRequired') || 'Full name is required')
      return
    }

    // Validate phone number (Indonesian format)
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/
      if (!phoneRegex.test(formData.phone.replace(/[\s-]/g, ''))) {
        setError(t('register.errorInvalidPhone') || 'Invalid phone number')
        return
      }
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError(t('register.errorPasswordMatch') || 'Passwords do not match')
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError(t('register.errorPasswordLength') || 'Password too short')
      return
    }

    setLoading(true)

    try {
      const result = await authService.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address
      })

      if ((result as any)?.needsEmailConfirmation) {
        alert(t('register.successEmailConfirm') || 'Registration successful! Please verify your email.')
      } else {
        alert(t('register.successLogin') || 'Registration successful!')
      }
      
      router.push('/login')
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || t('register.errorFailed') || 'Registration failed')
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
            <h1 className="text-2xl font-bold text-black">{t('register.title')}</h1>
            <p className="text-gray-600 mt-2">{t('register.subtitle')}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium mb-2 text-black">
                {t('register.fullName')} *
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                placeholder={t('register.fullNamePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-black">
                {t('login.email')} *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                placeholder={t('login.emailPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2 text-black">
                {t('register.phone')}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                placeholder="08123456789"
              />
              <p className="text-xs text-gray-500 mt-1">{t('register.phoneHelp')}</p>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium mb-2 text-black">
                {t('register.addressOptional')}
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                placeholder={t('register.address')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-black">
                {t('login.password')} *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 text-black"
                placeholder={t('login.passwordPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">{t('register.passwordHelp')}</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-black">
                {t('register.confirmPassword')} *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
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
              {loading ? t('register.submitting') : t('register.submit')}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              {t('register.haveAccount')}{' '}
              <Link href="/login" className="text-black font-semibold hover:underline">
                {t('register.signInLink')}
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
