'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'

export async function login(apiUrl: string, apiKey: string) {
  try {
    await signIn('credentials', {
      apiUrl,
      apiKey,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid credentials' }
        default:
          return { error: 'Authentication failed' }
      }
    }
    throw error
  }
}