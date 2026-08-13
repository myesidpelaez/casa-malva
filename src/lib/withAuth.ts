import { getSession, type SessionData } from './auth'
import type { ActionResult } from '@/actions/catalogo'

export type Rol = 'admin' | 'recepcion' | 'profesional' | 'cliente'

export type AuthContext = {
  uid: string
  rol: Rol
  email: string
  nombre: string
}

/**
 * Envoltorio obligatorio para Server Actions protegidas (firebase-seguridad §3).
 *
 * En Next.js, toda Server Action es un endpoint HTTP público.
 * withAuth verifica la sesión server-side antes de ejecutar la lógica de la acción.
 */
export function withAuth<T, A extends unknown[]>(
  rolesPermitidos: Rol[],
  accion: (ctx: AuthContext, ...args: A) => Promise<ActionResult<T> | T>
) {
  return async (...args: A): Promise<ActionResult<T>> => {
    try {
      const session = await getSession()
      if (!session) {
        return { ok: false, error: 'no_autenticado' }
      }

      const rol = (session.rol || 'admin') as Rol
      if (!rolesPermitidos.includes(rol)) {
        return { ok: false, error: 'sin_permiso' }
      }

      const ctx: AuthContext = {
        uid: session.id,
        rol,
        email: session.email,
        nombre: session.nombre,
      }

      const result = await accion(ctx, ...args)
      if (result && typeof result === 'object' && 'ok' in result) {
        return result as ActionResult<T>
      }
      return { ok: true, data: result as T }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error de autenticación'
      return { ok: false, error: errorMsg }
    }
  }
}
