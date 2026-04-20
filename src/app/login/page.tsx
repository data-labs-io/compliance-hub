'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getNavigationPath } from '@/lib/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, Globe } from 'lucide-react'
import { login } from '@/app/actions/login'

export default function LoginPage() {
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await login(apiUrl, apiKey)

      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
      } else {
        // Login successful - the server action will redirect
        router.push(getNavigationPath('/dashboard'))
      }
    } catch (err: any) {
      console.error('Login error:', err)

      // Check if it's a Next.js server action error
      if (err?.message?.includes('Server Action')) {
        setError('Session expired. Please clear your browser cache and try again.')
        setIsLoading(false)
        return
      }

      // Check if it's actually a redirect (which throws in server actions)
      if (err?.digest?.includes('NEXT_REDIRECT')) {
        setError('Authentication successful, redirecting...')
        setTimeout(() => {
          window.location.href = getNavigationPath('/dashboard')
        }, 100)
      } else {
        setError('Authentication failed. Please check your credentials and IP Fabric URL.')
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md p-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <svg width="64" height="62" viewBox="0 0 203.6 198.4" className="block" xmlns="http://www.w3.org/2000/svg">
              <g id="Group_2">
                <path id="Vector" fill="#8c989b" fillRule="evenodd" d="M152.1,132.5c0,10-9.4,17.8-20.1,15.4-5.9-1.4-10.7-5.9-12.1-11.6-2.5-10.4,5.6-19.7,15.8-19.7,9.1-.2,16.4,7.1,16.4,15.9Z"></path>
                <path id="Vector_2" fill="#264183" fillRule="evenodd" d="M83.7,66.1c0,10-9.4,17.8-20.1,15.4-5.9-1.4-10.7-5.9-12.1-11.6-2.5-10.4,5.6-19.7,15.8-19.7s16.4,7.1,16.4,15.9Z"></path>
              </g>
              <path id="Vector_3" fill="#264183" d="M202.8,16.2v166c0,8.8-7.3,15.9-16.2,15.9h-101.6l33.7-33c5.1,2.6,11,4.1,17.2,4.1,9,0,17.3-3.2,23.8-8.3,1.9-1.5,3.7-3.3,5.3-5.1,6.5-7.7,9.9-17.8,8.2-28.9-2.3-15.6-14.2-27.8-30.2-30.7-9-1.7-17.5-.2-24.7,3.5l-17.3-16.9c2.6-5,4.2-10.6,4.2-16.6s-1.5-12.1-4.3-17.2L150.4.3h36c9.1,0,16.4,7.1,16.4,15.9Z"></path>
              <path id="Vector_4" fill="#8c989b" d="M.8,182.2V16.2C.8,7.4,8.1.3,17,.3h101.6l-33.7,33c-5.1-2.6-11-4.1-17.2-4.1-9,0-17.3,3.2-23.8,8.3-1.9,1.5-3.7,3.3-5.3,5.1-6.5,7.7-9.9,17.8-8.2,28.9,2.3,15.6,14.2,27.8,30.2,30.7,9,1.7,17.5,.2,24.7-3.5l17.3,16.9c-2.6,5-4.2,10.6-4.2,16.6s1.5,12.1,4.3,17.2L53.2,198.1h-36c-9.1,0-16.4-7.1-16.4-15.9Z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold ipf-heading">Rapid Network GAP Analysis</h1>
          <p className="text-gray-600 mt-2">Network Analytics & Compliance Monitoring</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Sign in to the compliance dashboard</CardTitle>
            <CardDescription>
              Enter your IP Fabric instance URL and API key to access the compliance dashboard
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="api-url">IP Fabric URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="api-url"
                    type="url"
                    placeholder="https://your-instance.ipfabric.io"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your IP Fabric API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full ipf-button-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Need help? Check the <a href="https://docs.ipfabric.io/api/" target="_blank" rel="noopener noreferrer" className="ipf-secondary underline">IP Fabric API documentation</a></p>
        </div>
      </div>
    </div>
  )
}