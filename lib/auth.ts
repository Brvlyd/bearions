import { supabase } from './supabase'
import {
  buildEmailConfirmUrl,
  buildPasswordResetUrl,
  getBrowserOrigin,
  getSiteOrigin,
} from './site-url'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  full_name?: string
  phone?: string
  address?: string
}

export type UserRole = 'admin' | 'user'

/** Where a signed-in account belongs. Shared by the login form and the email-confirm page. */
export const getDashboardPath = (role?: UserRole | null) =>
  role === 'admin' ? '/admin/dashboard' : '/catalog'

export const authService = {
  async clearLocalAuthState() {
    try {
      // Scope local prevents revoking remote sessions and only clears browser state.
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // no-op
    }
  },

  async getSessionSafely() {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      if (error.message?.includes('Invalid Refresh Token')) {
        await this.clearLocalAuthState()
        return null
      }

      throw error
    }

    return data.session
  },

  // Register new user
  async register(data: RegisterData) {
    try {
      const normalizedEmail = data.email.trim().toLowerCase()

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(normalizedEmail)) {
        throw new Error('Invalid email format')
      }

      // Validate phone if provided
      if (data.phone) {
        const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/
        if (!phoneRegex.test(data.phone.replace(/[\s-]/g, ''))) {
          throw new Error('Invalid phone number format')
        }
      }

      // Check if phone already exists (if phone provided)
      if (data.phone) {
        const cleanPhone = data.phone.replace(/[\s-]/g, '')
        const { data: existingUserByPhone } = await supabase
          .from('users')
          .select('phone')
          .eq('phone', cleanPhone)
          .single()

        if (existingUserByPhone) {
          throw new Error('DUPLICATE_PHONE: Nomor telepon sudah terdaftar. Silakan gunakan nomor lain.')
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: data.password,
        options: {
          emailRedirectTo: buildEmailConfirmUrl(getSiteOrigin(getBrowserOrigin()), normalizedEmail),
          data: {
            full_name: data.full_name,
            phone: data.phone,
            address: data.address,
          }
        }
      })

      if (authError) throw authError

      // Supabase hides account existence by answering with a decoy user that has
      // no identities instead of an error. Treating that as a fresh signup is what
      // told returning users to watch for a confirmation email nobody ever sent.
      if (authData.user && authData.user.identities?.length === 0) {
        throw new Error('DUPLICATE_EMAIL: Email sudah terdaftar. Silakan login atau reset password jika lupa akun.')
      }

      // Database trigger will automatically create user profile
      // Wait a moment for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Supabase behavior:
      // - session exists => email confirmation disabled (user can login immediately)
      // - session null => email confirmation required before login
      const needsEmailConfirmation = !authData.session

      const message = needsEmailConfirmation
        ? 'Registration successful! Please check your email and click the confirmation link before logging in.'
        : 'Registration successful! You can login immediately.'

      return { 
        ...authData,
        needsEmailConfirmation,
        message,
      }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  // Login for both admin and user
  async login(credentials: LoginCredentials, role?: UserRole) {
    try {
      const normalizedEmail = credentials.email.trim().toLowerCase()

      // Remove stale local session first so invalid refresh tokens do not poison fresh login attempts.
      await this.getSessionSafely()

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: credentials.password,
      })

      if (error) {
        // Check for email not confirmed error
        if (error.message.includes('Email not confirmed')) {
          throw new Error('EMAIL_NOT_CONFIRMED: Please check your email and click the confirmation link before logging in.')
        }
        throw error
      }

      // If role is specified, check that table
      if (role === 'admin') {
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('id', data.user?.id)
          .single()

        if (adminError || !adminData) {
          await supabase.auth.signOut()
          throw new Error('Unauthorized: Not an admin')
        }

        return { user: data.user, profile: adminData, role: 'admin' as UserRole }
      } else if (role === 'user') {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user?.id)
          .single()

        if (userError || !userData) {
          await supabase.auth.signOut()
          throw new Error('User profile not found')
        }

        return { user: data.user, profile: userData, role: 'user' as UserRole }
      }

      // If no role specified, determine automatically
      return this.getUserWithRole(data.user)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  // Resend verification email for unconfirmed users.
  //
  // Goes through our own route rather than supabase.auth.resend() directly: that
  // call reports success even when the address is unregistered or already
  // confirmed, so the browser cannot tell whether mail was actually sent. The
  // route checks the account first and returns wording that matches reality.
  async resendEmailVerification(email: string, language: 'en' | 'id' = 'id') {
    const normalizedEmail = email.trim().toLowerCase()

    const response = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, language }),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(
        body.message ||
          (language === 'en'
            ? 'Failed to resend verification email.'
            : 'Gagal mengirim ulang email verifikasi.')
      )
    }

    return body as { message: string }
  },

  // Send password reset email through our own Brevo template.
  // Falls back to Supabase's built-in email when the API route is unavailable,
  // so a missing Brevo/service-role key never leaves users unable to recover.
  async sendPasswordResetEmail(email: string, language: 'en' | 'id' = 'id') {
    const normalizedEmail = email.trim().toLowerCase()

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, language }),
      })

      if (response.ok) {
        return await response.json()
      }

      // 400 (bad email) and 429 (rate limited) are meant for the user to read.
      if (response.status !== 500) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.message || 'Failed to send reset password email.')
      }

      console.warn('Forgot-password API unavailable, falling back to Supabase email')
    } catch (error) {
      if (error instanceof Error && !error.message.includes('fetch')) throw error
      console.warn('Forgot-password request failed, falling back to Supabase email:', error)
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: buildPasswordResetUrl(getSiteOrigin(getBrowserOrigin())),
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Send reset password email error:', error)
      throw error
    }
  },

  // Update password after recovery link
  async updatePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Update password error:', error)
      throw error
    }
  },

  // Get user with their role
  async getUserWithRole(user: User) {
    if (!user) return null

    // Check if admin
    const { data: adminData } = await supabase
      .from('admins')
      .select('*')
      .eq('id', user.id)
      .single()

    if (adminData) {
      return { user, profile: adminData, role: 'admin' as UserRole }
    }

    // Check if user
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userData) {
      return { user, profile: userData, role: 'user' as UserRole }
    }

    return null
  },

  // Logout
  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current session
  async getSession() {
    return this.getSessionSafely()
  },

  // Check if user is admin
  async isAdmin() {
    try {
      const session = await this.getSession()
      if (!session?.user) return false

      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', session.user.id)
        .single()

      return !error && !!data
    } catch {
      return false
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      // First check session
      const session = await this.getSession()
      if (!session?.user) return null
      
      // Then get user data
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      
      return this.getUserWithRole(user)
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  },

  // Get user profile
  async getUserProfile() {
    try {
      const session = await this.getSession()
      if (!session?.user) return null

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting user profile:', error)
      return null
    }
  },

  // Update user profile
  async updateUserProfile(updates: Partial<RegisterData>) {
    try {
      const session = await this.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', session.user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session)
    })
  }
}

