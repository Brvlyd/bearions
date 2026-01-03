import { supabase } from './supabase'

export interface LoginCredentials {
  email: string
  password: string
}

export const authService = {
  // Login admin
  async login(credentials: LoginCredentials) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) throw error

      // Cek apakah user adalah admin
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', data.user?.id)
        .single()

      if (adminError || !adminData) {
        await supabase.auth.signOut()
        throw new Error('Unauthorized: Not an admin')
      }

      return { user: data.user, admin: adminData }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
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
    return user
  }
}
