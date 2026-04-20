'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getNavigationPath } from '@/lib/navigation'
import { apiFetch, getApiPath, getApiBasePath } from '@/lib/api-path'
import { isClientExtensionMode } from '@/lib/client-extension-mode'

/**
 * Root page - redirects to appropriate destination
 *
 * Extension mode (unconfigured): → /setup
 * Extension mode (configured): → /dashboard
 * Standalone mode: → /dashboard
 */
export default function Home() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    async function checkSetupStatus() {
      console.log('Home - Starting setup check...')
      // Check if we're in extension mode based on URL
      const inExtensionMode = isClientExtensionMode()
      console.log('Home - In extension mode:', inExtensionMode)
      console.log('Home - API Base Path:', getApiBasePath())

      // We need to check if we're authenticated/configured by trying to fetch snapshots
      try {
        const fetchUrl = getApiPath('/api/ipfabric/snapshots')
        console.log('Home - Fetching from:', fetchUrl)

        // Add 10-second timeout to prevent infinite hang
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          console.warn('Home - API check timed out after 10s')
          controller.abort()
        }, 10000)

        const response = await fetch(fetchUrl, {
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        console.log('Home - API response status:', response.status)

        if (response.status === 401) {
          // Unauthorized - redirect to login page for manual fallback
          console.error('Root - API returned 401')
          const loginPath = getNavigationPath('/login')
          console.log('Root - Redirecting to:', loginPath)
          router.push(loginPath)
          return
        }

        if (response.ok) {
          // API works - go to dashboard
          const dashboardPath = getNavigationPath('/dashboard')
          console.log('Root - Success, redirecting to:', dashboardPath)
          router.push(dashboardPath)
        } else {
          // Other error - go to login to allow manual fallback
          console.error('Root - API returned error:', response.status)
          const loginPath = getNavigationPath('/login')
          console.log('Root - Redirecting to:', loginPath)
          router.push(loginPath)
        }
      } catch (error) {
        console.error('Root - Error checking API (timeout or network error):', error)
        // On timeout or network error, redirect to login
        const loginPath = getNavigationPath('/login')
        console.log('Root - Error fallback, redirecting to:', loginPath)
        router.push(loginPath)
      } finally {
        setIsChecking(false)
      }
    }

    checkSetupStatus()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full p-8 text-center bg-white rounded-xl shadow-lg">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-6"></div>
        <h1 className="text-xl font-bold mb-2 text-gray-800">Compliance Hub</h1>
        <p className="text-gray-600 mb-6 font-medium">
          {isChecking ? 'Connecting to IP Fabric...' : 'Redirecting...'}
        </p>

        <div className="pt-6 border-t border-gray-100 text-sm">
          <p className="text-gray-400 mb-4">Taking too long?</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push(getNavigationPath('/dashboard'))}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold"
            >
              Skip to Dashboard
            </button>
            <button
              onClick={() => router.push(getNavigationPath('/setup'))}
              className="text-gray-500 hover:text-gray-700 hover:underline transition-color"
            >
              Reconfigure Extension
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}