'use server'

import { authenticateUser, createSession, destroySession, getSession, SessionData } from '@/lib/auth'
import type { ActionResult } from './catalogo'

export async function loginAction(email: string, pass: string): Promise<ActionResult<SessionData>> {
  try {
    const user = await authenticateUser(email.trim().toLowerCase(), pass)
    if (!user) {
      return { ok: false, error: 'Credenciales inválidas. Verifica tu correo y contraseña.' }
    }

    await createSession(user)
    const session = await getSession()
    if (!session) {
      return { ok: false, error: 'Error al establecer sesión.' }
    }

    return { ok: true, data: session }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al iniciar sesión'
    return { ok: false, error: errorMsg }
  }
}

export async function logoutAction(): Promise<ActionResult<null>> {
  try {
    await destroySession()
    return { ok: true, data: null }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al cerrar sesión'
    return { ok: false, error: errorMsg }
  }
}

export async function sesionActualAction(): Promise<ActionResult<SessionData | null>> {
  try {
    const session = await getSession()
    return { ok: true, data: session }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al obtener sesión'
    return { ok: false, error: errorMsg }
  }
}
