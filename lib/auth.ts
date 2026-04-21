import { supabase } from './supabase'
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

const buildLoginRedirectUrl = (email?: string) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  if (!baseUrl) return undefined

  const params = new URLSearchParams({
    next: '/login',
    confirmed: 'true',
  })

  if (email) {
    params.set('email', email)
  }

  return `${baseUrl}/auth/confirm?${params.toString()}`
}

const buildResetPasswordRedirectUrl = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  if (!baseUrl) return undefined

  return `${baseUrl}/auth/reset-password`
}

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

      // Check if email already exists in users table
      const { data: existingUserByEmail } = await supabase
        .from('users')
        .select('email')
        .eq('email', normalizedEmail)
        .single()

      if (existingUserByEmail) {
        try {
          await this.resendEmailVerification(normalizedEmail)

          return {
            user: null,
            session: null,
            needsEmailConfirmation: true,
            existingAccount: true,
            message: 'Akun dengan email ini sudah ada. Email verifikasi baru sudah kami kirim. Silakan cek inbox/spam lalu lanjut login.',
          }
        } catch {
          throw new Error('DUPLICATE_EMAIL: Email sudah terdaftar. Silakan login atau reset password jika lupa akun.')
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
          emailRedirectTo: buildLoginRedirectUrl(normalizedEmail),
          data: {
            full_name: data.full_name,
            phone: data.phone,
            address: data.address,
          }
        }
      })

      if (authError) throw authError

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

  // Resend verification email for unconfirmed users
  async resendEmailVerification(email: string) {
    try {
      const normalizedEmail = email.trim().toLowerCase()

      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: {
          emailRedirectTo: buildLoginRedirectUrl(normalizedEmail),
        },
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Resend verification email error:', error)
      throw error
    }
  },

  // Send password reset email
  async sendPasswordResetEmail(email: string) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildResetPasswordRedirectUrl(),
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

