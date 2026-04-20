import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import CryptoJS from 'crypto-js'
import { randomBytes } from 'crypto'

const ENCRYPTION_KEY = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || randomBytes(32).toString('hex')

export function encryptApiKey(apiKey: string): string {
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString()
}

export function decryptApiKey(encryptedApiKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedApiKey, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'IP Fabric',
      credentials: {
        apiUrl: {
          label: "IP Fabric URL",
          type: "url",
          placeholder: "https://your-instance.ipfabric.io"
        },
        apiKey: {
          label: "API Key",
          type: "password",
          placeholder: "Enter your IP Fabric API key"
        },
      },
      async authorize(credentials) {
        console.log('Authorize called with:', { apiUrl: credentials?.apiUrl })

        if (!credentials?.apiUrl || !credentials?.apiKey) {
          console.error('Missing credentials')
          return null
        }

        const apiUrl = credentials.apiUrl as string
        const apiKey = credentials.apiKey as string

        try {
          // Validate the API key by making a test request to IP Fabric
          console.log('Attempting to validate with IP Fabric:', apiUrl)

          // Clean up the URL - remove any path if present
          let baseUrl = apiUrl
          try {
            const urlObj = new URL(apiUrl)
            baseUrl = `${urlObj.protocol}//${urlObj.host}`
          } catch {
            // If URL parsing fails, try to clean it up
            baseUrl = apiUrl.replace(/\/+$/, '')
          }

          // Special handling for marketing.ipf.cx which may have different endpoints
          if (apiUrl.includes('marketing.ipf.cx')) {
            console.log('Marketing instance detected, trying special endpoints')

            // Try various endpoints for marketing instance
            const marketingEndpoints = [
              '/api/v1/auth/token/test',
              '/api/v1/snapshots',
              '/api/snapshots',
              '/api/v1/settings',
            ]

            for (const endpoint of marketingEndpoints) {
              try {
                const testUrl = `${baseUrl}${endpoint}`
                console.log(`Testing marketing endpoint: ${testUrl}`)

                const testResponse = await fetch(testUrl, {
                  headers: {
                    'X-API-Token': apiKey,
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                  },
                })

                console.log(`Marketing endpoint ${endpoint} status:`, testResponse.status)

                // If we get any successful response or auth error, the instance is alive
                if (testResponse.status === 200 || testResponse.status === 401 || testResponse.status === 403) {
                  // Marketing instance is accessible, allow login
                  const encryptedApiKey = encryptApiKey(apiKey)
                  return {
                    id: CryptoJS.MD5(apiKey).toString(),
                    email: `user@marketing.ipf.cx`,
                    name: 'IP Fabric User',
                    apiUrl,
                    apiKey: encryptedApiKey,
                    ipFabricVersion: '',
                  }
                }
              } catch (e) {
                console.error(`Marketing endpoint ${endpoint} error:`, e)
              }
            }
          }

          // Try multiple API versions and endpoints
          let response: Response | null = null
          const versions = ['v7.0', 'v6.9', 'v6.8', 'v6.7', 'v6.6', 'v6.5', 'v6.4', 'v6.3', 'v6.2', 'v6.1', 'v6.0', 'v5.0']
          let lastError = null

          // First, try a simple API test to see if we can connect at all
          try {
            console.log(`Testing basic connectivity to: ${baseUrl}/api`)
            const basicTest = await fetch(`${baseUrl}/api`, {
              headers: {
                'X-API-Token': apiKey,
                'Content-Type': 'application/json',
              },
            })
            console.log('Basic API test response:', basicTest.status)
          } catch (e) {
            console.error('Basic connectivity test failed:', e)
          }

          for (const version of versions) {
            try {
              const testUrl = `${baseUrl}/api/${version}/os/version`
              console.log(`Trying IP Fabric API ${version} at:`, testUrl)

              response = await fetch(testUrl, {
                headers: {
                  'X-API-Token': apiKey,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                method: 'GET',
              })

              console.log(`IP Fabric API ${version} response status:`, response.status)

              if (response.ok) {
                console.log(`IP Fabric API version ${version} successful`)
                break
              } else if (response.status === 401 || response.status === 403) {
                console.error('Authentication failed: Invalid API key')
                lastError = 'Invalid API key'
                break // Stop trying versions if auth fails
              } else if (response.status === 404) {
                console.log(`Version ${version} not found, trying next...`)
              } else if (response.status === 410) {
                console.error(`API endpoint permanently moved or no longer available (410 Gone)`)
                lastError = 'API endpoint no longer available (410)'
              } else {
                console.log(`Unexpected status ${response.status} for version ${version}`)
                const responseText = await response.text()
                console.log('Response body:', responseText.substring(0, 200))
              }
            } catch (e: any) {
              console.error(`Error trying version ${version}:`, e.message || e)
              lastError = e
              // Try next version
            }
          }

          if (!response || !response.ok) {
            console.error('IP Fabric API authentication failed:', response?.status || 'No response', lastError)
            if (response?.status === 401 || response?.status === 403) {
              console.error('Invalid API key provided')
            } else if (response?.status === 410) {
              console.error('The API endpoint is no longer available. Please check your IP Fabric URL.')
            } else if (!response) {
              console.error('Could not connect to IP Fabric. Please check the URL and network connectivity.')
            }
            return null
          }

          // Check if response is JSON
          const contentType = response.headers.get('content-type')
          if (!contentType?.includes('application/json')) {
            console.error('IP Fabric API returned non-JSON response')
            return null
          }

          const data = await response.json()

          // Encrypt the API key before storing
          const encryptedApiKey = encryptApiKey(apiKey)

          return {
            id: CryptoJS.MD5(apiKey).toString(),
            email: `user@${new URL(apiUrl).hostname}`,
            name: 'IP Fabric User',
            apiUrl,
            apiKey: encryptedApiKey,
            ipFabricVersion: data.version || 'Unknown',
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.apiUrl = user.apiUrl
        token.apiKey = user.apiKey
        token.ipFabricVersion = user.ipFabricVersion
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.apiUrl = token.apiUrl as string
        session.user.apiKey = token.apiKey as string
        session.user.ipFabricVersion = token.ipFabricVersion as string
      }
      return session
    },
  },
  debug: process.env.NODE_ENV === 'development',
})

// Extend the session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      apiUrl: string
      apiKey: string
      ipFabricVersion: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    apiUrl: string
    apiKey: string
    ipFabricVersion: string
  }
}