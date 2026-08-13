import { getSession } from './auth'
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
const ROLES_VALIDOS: readonly Rol[] = ['admin', 'recepcion', 'profesional', 'cliente']

function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES_VALIDOS as readonly string[]).includes(valor)
}

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

      // Falla cerrado (hallazgo F6): antes hacía `session.rol || 'admin'`, así que una sesión
      // sin rol —o con un rol retirado del sistema— se convertía en administradora.
      // Un rol ausente o desconocido es una sesión que no sabemos leer: se niega y se registra.
      if (!esRol(session.rol)) {
        console.error('[withAuth] sesión con rol ausente o desconocido', {
          uid: session.id,
          rolRecibido: session.rol,
        })
        return { ok: false, error: 'sin_permiso' }
      }

      if (!rolesPermitidos.includes(session.rol)) {
        return { ok: false, error: 'sin_permiso' }
      }

      const ctx: AuthContext = {
        uid: session.id,
        rol: session.rol,
        email: session.email,
        nombre: session.nombre,
      }

      const result = await accion(ctx, ...args)
      if (result && typeof result === 'object' && 'ok' in result) {
        return result as ActionResult<T>
      }
      return { ok: true, data: result as T }
    } catch (err: unknown) {
      // El error se registra en el servidor y NUNCA se devuelve al navegador (hallazgo F9):
      // los mensajes crudos de Firestore filtran nombres de colección, rutas e infraestructura.
      console.error('[withAuth] error no controlado en Server Action', err)
      return { ok: false, error: 'error_interno' }
    }
  }
}
