'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getNavigationPath } from '@/lib/navigation'
import { apiFetch } from '@/lib/api-path'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, CheckCircle, Globe, Info } from 'lucide-react'

export default function SetupPage() {
  const [apiToken, setApiToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState('')
  const [testResult, setTestResult] = useState<{
    success: boolean
    apiUrl?: string
    snapshotCount?: number
  } | null>(null)
  const router = useRouter()

  const handleTest = async () => {
    setIsTesting(true)
    setError('')
    setTestResult(null)

    try {
      const response = await apiFetch('/api/setup/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: apiToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to test connection')
        setTestResult({ success: false })
      } else {
        setTestResult({
          success: true,
          apiUrl: data.apiUrl,
          snapshotCount: data.snapshotCount,
        })
      }
    } catch (err) {
      console.error('Test error:', err)
      setError('Failed to test connection. Please try again.')
      setTestResult({ success: false })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await apiFetch('/api/setup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: apiToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to save token')
        setIsLoading(false)
      } else {
        // Success - redirect to dashboard
        router.push(getNavigationPath('/dashboard'))
      }
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save token. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md p-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <svg
              width="64"
              height="62"
              viewBox="0 0 203.6 198.4"
              className="block"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="Group_2">
                <path
                  id="Vector"
                  fill="#8c989b"
                  fillRule="evenodd"
                  d="M152.1,132.5c0,10-9.4,17.8-20.1,15.4-5.9-1.4-10.7-5.9-12.1-11.6-2.5-10.4,5.6-19.7,15.8-19.7,9.1-.2,16.4,7.1,16.4,15.9Z"
                ></path>
                <path
                  id="Vector_2"
                  fill="#264183"
                  fillRule="evenodd"
                  d="M83.7,66.1c0,10-9.4,17.8-20.1,15.4-5.9-1.4-10.7-5.9-12.1-11.6-2.5-10.4,5.6-19.7,15.8-19.7s16.4,7.1,16.4,15.9Z"
                ></path>
              </g>
              <path
                id="Vector_3"
                fill="#264183"
                d="M202.8,16.2v166c0,8.8-7.3,15.9-16.2,15.9h-101.6l33.7-33c5.1,2.6,11,4.1,17.2,4.1,9,0,17.3-3.2,23.8-8.3,1.9-1.5,3.7-3.3,5.3-5.1,6.5-7.7,9.9-17.8,8.2-28.9-2.3-15.6-14.2-27.8-30.2-30.7-9-1.7-17.5-.2-24.7,3.5l-17.3-16.9c2.6-5,4.2-10.6,4.2-16.6s-1.5-12.1-4.3-17.2L150.4.3h36c9.1,0,16.4,7.1,16.4,15.9Z"
              ></path>
              <path
                id="Vector_4"
                fill="#8c989b"
                d="M.8,182.2V16.2C.8,7.4,8.1.3,17,.3h101.6l-33.7,33c-5.1-2.6-11-4.1-17.2-4.1-9,0-17.3,3.2-23.8,8.3-1.9,1.5-3.7,3.3-5.3,5.1-6.5,7.7-9.9,17.8-8.2,28.9,2.3,15.6,14.2,27.8,30.2,30.7,9,1.7,17.5,.2,24.7-3.5l17.3,16.9c-2.6,5-4.2,10.6-4.2,16.6s1.5,12.1,4.3,17.2L53.2,198.1h-36c-9.1,0-16.4-7.1-16.4-15.9Z"
              ></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold ipf-heading">Extension Setup</h1>
          <p className="text-gray-600 mt-2">Configure your IP Fabric connection</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Enter API Token</CardTitle>
            <CardDescription>
              Your IP Fabric URL will be automatically detected. You only need to provide your API
              token.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {testResult?.success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="space-y-1">
                    <div className="font-semibold">Connection successful!</div>
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-3 w-3" />
                      <span className="font-mono text-xs">{testResult.apiUrl}</span>
                    </div>
                    <div className="text-sm">
                      Found {testResult.snapshotCount} snapshot{testResult.snapshotCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="api-token">IP Fabric API Token</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="api-token"
                  type="password"
                  placeholder="Enter your API token"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  required
                  disabled={isLoading || isTesting}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">
                Get your API token from IP Fabric: Settings → API Tokens
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={!apiToken || isLoading || isTesting}
              className="flex-1"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!apiToken || isLoading || isTesting || !testResult?.success}
              className="flex-1 ipf-button-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Continue'
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="mt-4 border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  How to Get Your API Token
                </h3>
                <p className="text-sm text-blue-800">
                  In IP Fabric, navigate to:{' '}
                  <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-xs">
                    Settings
                  </span>
                  {' → '}
                  <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-xs">
                    Integration
                  </span>
                  {' → '}
                  <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-xs">
                    API Tokens
                  </span>
                  {' → '}
                  <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-xs">
                    + Create token
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Need help?{' '}
            <a
              href="https://docs.ipfabric.io/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="ipf-secondary underline"
            >
              IP Fabric API documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
