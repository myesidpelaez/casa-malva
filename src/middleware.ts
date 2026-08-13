/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE_NAME = 'casamalva_session'

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('Falta SESSION_SECRET en las variables de entorno. La aplicación no arranca sin él.')
  }
  return secret
}

import { PERMISOS, type Permiso } from '@/lib/permisos'

// Lightweight crypto helper for Edge runtime in Next middleware using Web Crypto API
async function verifySessionToken(token: string): Promise<any | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [b64Payload, sigHex] = parts

    const payloadStr = Buffer.from(b64Payload, 'base64url').toString('utf-8')
    const payload = JSON.parse(payloadStr)

    if (payload.exp && Date.now() > payload.exp) return null

    // Verify HMAC-SHA256 signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(getSessionSecret()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Convert hex signature back to Uint8Array
    const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [])

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payloadStr))
    if (!isValid) return null
    return payload
  } catch {
    return null
  }
}

const ROUTE_PERMISSIONS: Record<string, Permiso> = {
  '/admin/catalogo': 'catalogo:editar',
  '/admin/profesionales': 'equipo:editar',
  '/admin/clientas': 'clienta:leer',
  '/admin/agente': 'catalogo:editar', // Solo admin puede ver agente, asumo catalogo:editar
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected paths: /admin and any subpath except /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = sessionCookie ? await verifySessionToken(sessionCookie) : null

    if (!session) {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Si intenta entrar a la raíz /admin, redirigir al módulo principal del rol
    if (pathname === '/admin') {
      if (session.rol === 'admin') {
        return NextResponse.redirect(new URL('/admin/catalogo', request.url))
      }
      // Los demás se quedan en /admin (agenda)
    }

    // Validar permisos por ruta
    for (const [route, permiso] of Object.entries(ROUTE_PERMISSIONS)) {
      if (pathname.startsWith(route)) {
        const roles = PERMISOS[permiso]
        if (!(roles as readonly string[]).includes(session.rol as string)) {
          return new NextResponse(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 })
        }
      }
    }
  }

  // If visiting /admin/login while already authenticated, redirect to their main module
  if (pathname === '/admin/login') {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = sessionCookie ? await verifySessionToken(sessionCookie) : null
    if (session) {
      const redirectPath = session.rol === 'admin' ? '/admin/catalogo' : '/admin'
      const adminUrl = new URL(redirectPath, request.url)
      return NextResponse.redirect(adminUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
