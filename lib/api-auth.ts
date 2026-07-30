import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

// Server-side auth helpers for API routes.
//
// Two client flavours, deliberately kept apart:
//   - session client: the caller's own token, so RLS still applies. Use it for
//     anything the caller should be allowed to see.
//   - service client: bypasses RLS entirely. Only reach for it after the caller
//     has been authenticated and authorised.

const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || ''

export const getBearerToken = (request: NextRequest): string => {
  const header = request.headers.get('authorization') || ''
  return header.startsWith('Bearer ') ? header.slice(7).trim() : ''
}

export const getSessionClient = (accessToken: string): SupabaseClient => {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  return createClient(getSupabaseUrl(), anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const getServiceClient = (): SupabaseClient => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type AuthenticatedCaller = {
  userId: string
  email: string | null
  sessionClient: SupabaseClient
}

/**
 * Verify the bearer token with Supabase. Returns null when the token is
 * missing, expired, or invalid — callers should answer 401 without detail.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedCaller | null> {
  const accessToken = getBearerToken(request)
  if (!accessToken) return null

  const sessionClient = getSessionClient(accessToken)
  const { data, error } = await sessionClient.auth.getUser()

  if (error || !data.user) return null

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    sessionClient,
  }
}

/**
 * Admin check mirroring the app's two conventions: a row in `admins`, or
 * `users.role = 'admin'`. Runs through the caller's own client so a broken RLS
 * policy cannot silently promote someone.
 */
export async function isAdminUser(caller: AuthenticatedCaller): Promise<boolean> {
  const { data: adminRow } = await caller.sessionClient
    .from('admins')
    .select('id')
    .eq('id', caller.userId)
    .maybeSingle()

  if (adminRow) return true

  const { data: roleRow } = await caller.sessionClient
    .from('users')
    .select('id')
    .eq('id', caller.userId)
    .eq('role', 'admin')
    .maybeSingle()

  return !!roleRow
}
