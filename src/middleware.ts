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

import { decidirRuta } from '@/lib/rutas'

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

/**
 * El portero del panel.
 *
 * No decide nada por su cuenta: lee la cookie, la verifica, y le pregunta a
 * `decidirRuta` — que es una función pura y **sí se puede probar desde un script**
 * (`npm run prueba:rutas`). Aquí solo se traduce la decisión a una respuesta de Next.
 *
 * Que la decisión viviera dentro de esta función, inalcanzable para cualquier prueba, es
 * lo que dejó la Agenda inaccesible para la dueña durante un día en producción.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null

  const decision = decidirRuta(pathname, session)

  switch (decision.tipo) {
    case 'a_login':
      return NextResponse.redirect(new URL('/admin/login', request.url))
    case 'a_panel':
      // Todos entran a la Agenda: es la pantalla del mostrador, la primera del día.
      return NextResponse.redirect(new URL('/admin', request.url))
    case 'denegar':
      return new NextResponse(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 })
    case 'seguir':
      return NextResponse.next()
  }
}

export const config = {
  matcher: ['/admin/:path*'],
}
