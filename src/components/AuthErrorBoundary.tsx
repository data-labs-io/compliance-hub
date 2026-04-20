'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getNavigationPath } from '@/lib/navigation'
import { isClientExtensionMode } from '@/lib/client-extension-mode'

interface AuthErrorBoundaryProps {
  children: React.ReactNode
}

/**
 * Global handler for authentication errors (401/403)
 * Automatically redirects to setup page when API token is invalid or missing
 */
export function AuthErrorBoundary({ children }: AuthErrorBoundaryProps) {
  const router = useRouter()

  useEffect(() => {
    const handleAuthError = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.isAuthError) {
        console.error('[AuthError] Token invalid/missing, redirecting to appropriate setup/login page')

        // Check mode based on current URL
        const inExtensionMode = isClientExtensionMode()

        if (inExtensionMode) {
          router.push(getNavigationPath('/setup'))
        } else {
          router.push(getNavigationPath('/login'))
        }
      }
    }

    // Listen for global auth error events
    window.addEventListener('authError', handleAuthError)

    return () => {
      window.removeEventListener('authError', handleAuthError)
    }
  }, [router])

  return <>{children}</>
}
