import { supabase } from './supabase'

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

  if (email) {
    return `${baseUrl}/login?confirmed=true&email=${encodeURIComponent(email)}`
  }

  return `${baseUrl}/login?confirmed=true`
}

const buildResetPasswordRedirectUrl = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  if (!baseUrl) return undefined

  return `${baseUrl}/auth/reset-password`
}

export const authService = {
  // Register new user
  async register(data: RegisterData) {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
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
        .eq('email', data.email.toLowerCase())
        .single()

      if (existingUserByEmail) {
        throw new Error('DUPLICATE_EMAIL: Email sudah terdaftar. Silakan gunakan email lain atau login.')
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
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: buildLoginRedirectUrl(data.email),
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
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
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: buildLoginRedirectUrl(email),
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
  async getUserWithRole(user: any) {
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
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
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
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session)
    })
  }
}

