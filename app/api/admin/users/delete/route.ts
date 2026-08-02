import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, getServiceClient, isAdminUser } from '@/lib/api-auth'

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    const parts = [
      typeof err.message === 'string' ? err.message : '',
      typeof err.details === 'string' ? err.details : '',
      typeof err.hint === 'string' ? err.hint : '',
      typeof err.code === 'string' ? `code: ${err.code}` : '',
    ].filter(Boolean)
    return parts.join(' | ')
  }
  return 'Unknown error'
}

export async function POST(request: NextRequest) {
  try {
    const caller = await authenticateRequest(request)
    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isAdminUser(caller)
    if (!isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as { userId?: string }
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (!userId) {
      return NextResponse.json({ message: 'Missing required field: userId' }, { status: 400 })
    }

    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ message: 'Invalid userId format' }, { status: 400 })
    }

    const serviceClient = getServiceClient()

    const { error: deleteProfileError } = await serviceClient
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteProfileError) {
      console.error('Error deleting user profile row:', deleteProfileError)
      return NextResponse.json(
        { message: getErrorMessage(deleteProfileError) || 'Failed to delete user profile' },
        { status: 500 }
      )
    }

    let authWarning: string | null = null

    try {
      const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(userId)

      if (deleteAuthError) {
        const authErrorMessage = getErrorMessage(deleteAuthError)
        console.error('Error deleting auth user:', deleteAuthError)

        if (authErrorMessage.toLowerCase().includes('user not found')) {
          authWarning = 'Auth user not found; profile row deleted.'
        } else {
          return NextResponse.json(
            { message: authErrorMessage || 'Failed to delete auth user' },
            { status: 500 }
          )
        }
      }
    } catch (error) {
      const authErrorMessage = getErrorMessage(error)
      console.error('Exception deleting auth user:', error)

      if (authErrorMessage.toLowerCase().includes('user not found')) {
        authWarning = 'Auth user not found; profile row deleted.'
      } else {
        return NextResponse.json(
          { message: authErrorMessage || 'Failed to delete auth user' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      {
        message: authWarning ? 'User profile deleted.' : 'User deleted successfully',
        warning: authWarning,
      },
      { status: 200 }
    )
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('Error in admin user delete API:', message, error)
    return NextResponse.json(
      { message: 'Failed to delete user', error: message },
      { status: 500 }
    )
  }
}
