import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iktbpmqahpkboovgbbib.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_U1bLx1ViEflYjYCCaEJR6w_yTqsN-PK'
  
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        storageKey: 'bearions-auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    }
  )
}
