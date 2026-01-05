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

export const authService = {
  // Register new user
  async register(data: RegisterData) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) throw authError

      // Update user profile if additional data provided
      if (authData.user && (data.full_name || data.phone || data.address)) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: data.full_name,
            phone: data.phone,
            address: data.address,
          })
          .eq('id', authData.user.id)

        if (updateError) {
          console.error('Error updating user profile:', updateError)
        }
      }

      return authData
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

      if (error) throw error

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    return this.getUserWithRole(user)
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
  }
}

