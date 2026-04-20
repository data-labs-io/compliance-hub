import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    // Clear all auth-related cookies
    const cookieStore = await cookies()

    // Clear NextAuth session cookie
    cookieStore.delete('authjs.session-token')
    cookieStore.delete('authjs.callback-url')
    cookieStore.delete('authjs.csrf-token')
    cookieStore.delete('__Secure-authjs.session-token')
    cookieStore.delete('__Host-authjs.csrf-token')

    // Also try to clear with different settings
    const cookieOptions = {
      path: '/',
      sameSite: 'lax' as const,
      secure: false,
      httpOnly: true,
      maxAge: 0,
    }

    cookieStore.set('authjs.session-token', '', cookieOptions)
    cookieStore.set('__Secure-authjs.session-token', '', cookieOptions)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}