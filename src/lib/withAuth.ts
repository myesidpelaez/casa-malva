import { getSession, type SessionData } from './auth'
import type { ActionResult } from '@/actions/catalogo'
import { PERMISOS, type Permiso, type Rol } from './permisos'

export type AuthContext = {
  uid: string
  rol: Rol
  email: string
  nombre: string
  professionalId?: string
}

const ROLES_VALIDOS: readonly Rol[] = ['admin', 'recepcion', 'profesional']

function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES_VALIDOS as readonly string[]).includes(valor)
}

export type DecisionAcceso =
  | { ok: true; ctx: AuthContext }
  | { ok: false; error: 'no_autenticado' | 'sin_permiso' }

/**
 * La decisión de acceso, aislada del contexto de Next.
 *
 * Existe separada por una razón concreta: `withAuth` necesita `cookies()` de `next/headers`,
 * que solo funciona dentro de una petición, así que **no se puede probar desde un script**.
 * La tentación —y el error que ya se cometió dos veces en este proyecto— es que la prueba se
 * escriba una copia de esta lógica y se pruebe a sí misma.
 *
 * Aquí no hay copia: `withAuth` llama a esta función, y la prueba llama a esta misma función.
 * Si cambia, cambian las dos a la vez. Ver 04-BIBLIOTECA/patrones/guardianes-que-no-guardan.
 */
export function decidirAcceso(session: SessionData | null, permiso: Permiso): DecisionAcceso {
  if (!session) {
    return { ok: false, error: 'no_autenticado' }
  }

  // Falla cerrado (hallazgo F6): un rol ausente o desconocido no se interpreta, se niega.
  if (!esRol(session.rol)) {
    console.error('[withAuth] sesión con rol ausente o desconocido', {
      uid: session.id,
      rolRecibido: session.rol,
    })
    return { ok: false, error: 'sin_permiso' }
  }

  const rolesPermitidos = PERMISOS[permiso]
  if (!rolesPermitidos || !(rolesPermitidos as readonly string[]).includes(session.rol)) {
    return { ok: false, error: 'sin_permiso' }
  }

  return {
    ok: true,
    ctx: {
      uid: session.id,
      rol: session.rol,
      email: session.email,
      nombre: session.nombre,
      professionalId: session.professionalId,
    },
  }
}

export function withAuth<T, A extends unknown[]>(
  permiso: Permiso,
  accion: (ctx: AuthContext, ...args: A) => Promise<ActionResult<T> | T>
) {
  const funcionProtegida = async (...args: A): Promise<ActionResult<T>> => {
    try {
      const decision = decidirAcceso(await getSession(), permiso)
      if (!decision.ok) {
        return { ok: false, error: decision.error }
      }
      const ctx = decision.ctx

      const result = await accion(ctx, ...args)
      if (result && typeof result === 'object' && 'ok' in result) {
        return result as ActionResult<T>
      }
      return { ok: true, data: result as T }
    } catch (err: unknown) {
      console.error('[withAuth] error no controlado en Server Action', err)
      return { ok: false, error: 'error_interno' }
    }
  }
  
  // Tag for tests
  ;(funcionProtegida as unknown as Record<string, unknown>).__isWithAuth = true;
  // Expose for mocking in tests if needed
  ;(funcionProtegida as unknown as Record<string, unknown>).__accion = accion;
  ;(funcionProtegida as unknown as Record<string, unknown>).__permiso = permiso;

  return funcionProtegida;
}
