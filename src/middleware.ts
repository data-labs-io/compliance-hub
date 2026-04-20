import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  console.log(`[Middleware] Request: ${request.method} ${request.nextUrl.pathname}`)

  // Simplified middleware - just add security headers, no auth
  const response = NextResponse.next()

  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://*.ipfabric.io https://ipfabric.io wss://; " +
    "frame-ancestors 'self';"
  )

  return response
}

export const config = {
  matcher: [
    // Apply to all paths to help debug
    '/:path*',
  ],
}