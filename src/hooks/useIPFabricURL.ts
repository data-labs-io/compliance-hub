'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api-path'
import { useDashboardStore } from '@/stores/dashboard-store'

/**
 * Hook to get the IP Fabric instance URL from the current session
 * Uses global cache to avoid duplicate API calls
 *
 * @returns The IP Fabric base URL (e.g., "https://marketing.ipf.cx")
 */
export function useIPFabricURL() {
  const { sessionApiUrl, setSessionApiUrl } = useDashboardStore()
  const [ipFabricUrl, setIpFabricUrl] = useState<string>('')

  useEffect(() => {
    // Use cached session if available
    if (sessionApiUrl) {
      setIpFabricUrl(sessionApiUrl.replace(/\/$/, ''))
      return
    }

    // Fetch once if not cached
    async function fetchApiUrl() {
      try {
        const response = await apiFetch('/api/auth/session')
        if (response.ok) {
          const session = await response.json()
          const apiUrl = session?.user?.apiUrl || ''
          const cleanUrl = apiUrl.replace(/\/$/, '')

          // Cache globally for other components
          setSessionApiUrl(cleanUrl)
          setIpFabricUrl(cleanUrl)
        }
      } catch (error) {
        console.error('Failed to fetch IP Fabric URL from session:', error)
      }
    }
    fetchApiUrl()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionApiUrl]) // setSessionApiUrl is stable Zustand action

  return ipFabricUrl
}
