'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
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
      setError('Please enter a valid email address (e.g., example@gmail.com)')
      return
    }

    // Validate required fields
    if (!formData.full_name.trim()) {
      setError('Full name is required')
      return
    }

    // Validate phone number (Indonesian format)
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/
      if (!phoneRegex.test(formData.phone.replace(/[\s-]/g, ''))) {
        setError('Please enter a valid phone number (e.g., 08123456789 or +628123456789)')
        return
      }
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
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
        alert('Registration successful! Please check your email (including spam folder) to verify your account before logging in.')
      } else {
        alert('Registration successful! You can now login with your credentials.')
      }
      
      router.push('/login')
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-bold text-2xl rounded mx-auto mb-4">
              B
            </div>
            <h1 className="text-2xl font-bold text-black">Create Account</h1>
            <p className="text-gray-600 mt-2">Join Bearions community</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium mb-2 text-black">
                Full Name *
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-black">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2 text-black">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
                placeholder="08123456789 or +628123456789"
              />
              <p className="text-xs text-gray-500 mt-1">Indonesian format: 08xx-xxxx-xxxx</p>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium mb-2 text-black">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
                placeholder="Your address..."
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-black">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-black">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition disabled:bg-gray-400"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-black font-semibold hover:underline">
                Sign in
              </Link>
            </p>
            <Link href="/" className="text-sm text-gray-600 hover:text-black block">
              ← Back to store
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
