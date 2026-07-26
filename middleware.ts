import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Global Edge Security Middleware (OWASP API5 / NIST Protect / ASVS V2 & V14)
 * Enforces security response headers and guards administrative routes.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Apply Security Headers to all responses
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Protect Admin endpoints (/admin and /api/admin)
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    // Check for internal API secret header if provided
    const internalSecret =
      request.headers.get('x-internal-secret') || request.headers.get('authorization')
    const expectedSecret = process.env.INTERNAL_API_SECRET

    if (
      expectedSecret &&
      internalSecret !== expectedSecret &&
      !internalSecret?.includes(expectedSecret)
    ) {
      // In production, require authentication or matching internal secret
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized administrative access.' },
          { status: 401 }
        )
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
