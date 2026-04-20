'use client'

import { useEffect } from 'react'
import { apiFetch } from '@/lib/api-path'

export default function LogoutPage() {
  useEffect(() => {
    // Clear all client-side storage
    localStorage.clear()
    sessionStorage.clear()

    // Clear cookies via API
    apiFetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    }).then(() => {
      // Force redirect to login with logout parameter
      window.location.href = '/login?logout=true'
    }).catch(() => {
      // Even if API fails, still redirect
      window.location.href = '/login?logout=true'
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Logging out...</h2>
        <p className="text-gray-600">Please wait while we sign you out</p>
      </div>
    </div>
  )
}