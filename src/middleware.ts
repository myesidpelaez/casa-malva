import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE_NAME = 'casamalva_session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'casamalva-local-secret-key-2026-xyz'

// Lightweight crypto helper for Edge runtime in Next middleware using Web Crypto API
async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return false
    const [b64Payload, sigHex] = parts

    const payloadStr = Buffer.from(b64Payload, 'base64url').toString('utf-8')
    const payload = JSON.parse(payloadStr)

    if (payload.exp && Date.now() > payload.exp) return false

    // Verify HMAC-SHA256 signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Convert hex signature back to Uint8Array
    const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [])

    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payloadStr))
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected paths: /admin and any subpath except /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value

    if (!sessionCookie || !(await verifySessionToken(sessionCookie))) {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // If visiting /admin/login while already authenticated, redirect to /admin
  if (pathname === '/admin/login') {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (sessionCookie && (await verifySessionToken(sessionCookie))) {
      const adminUrl = new URL('/admin', request.url)
      return NextResponse.redirect(adminUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
