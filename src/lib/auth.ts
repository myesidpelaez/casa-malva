import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { getUserByEmail, UserRow } from './db'

const SESSION_COOKIE_NAME = 'casamalva_session'

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('Falta SESSION_SECRET en las variables de entorno. La aplicación no arranca sin él.')
  }
  return secret
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false
  const [salt, key] = storedHash.split(':')
  const keyBuffer = Buffer.from(key, 'hex')
  const derivedKey = crypto.scryptSync(password, salt, 64)
  if (keyBuffer.length !== derivedKey.length) return false
  return crypto.timingSafeEqual(keyBuffer, derivedKey)
}

function signPayload(payloadStr: string): string {
  const hmac = crypto.createHmac('sha256', getSessionSecret())
  hmac.update(payloadStr)
  return hmac.digest('hex')
}

export type SessionData = {
  id: string
  email: string
  nombre: string
  rol: string
  exp: number
}

export async function createSession(user: { id: string; email: string; nombre: string; rol: string }): Promise<void> {
  const exp = Date.now() + 7 * 24 * 3600 * 1000 // 7 days
  const payload: SessionData = {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    exp,
  }
  const payloadStr = JSON.stringify(payload)
  const sig = signPayload(payloadStr)
  const cookieValue = `${Buffer.from(payloadStr).toString('base64url')}.${sig}`

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: false, // Local dev over HTTP / LAN IP
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 3600,
  })
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const cookieVal = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!cookieVal) return null

    const [b64Payload, sig] = cookieVal.split('.')
    if (!b64Payload || !sig) return null

    const payloadStr = Buffer.from(b64Payload, 'base64url').toString('utf-8')
    const expectedSig = signPayload(payloadStr)

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null
    }

    const session: SessionData = JSON.parse(payloadStr)
    if (Date.now() > session.exp) {
      return null
    }

    return session
  } catch {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function authenticateUser(email: string, pass: string): Promise<UserRow | null> {
  const user = await getUserByEmail(email)
  if (!user) return null
  const isValid = verifyPassword(pass, user.passwordHash)
  if (!isValid) return null
  return user
}
