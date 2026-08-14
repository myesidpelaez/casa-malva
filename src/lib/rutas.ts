import { PERMISOS, type Permiso } from './permisos'

/**
 * Permiso exigido por cada ruta del panel. Lo que no está aquí solo pide sesión.
 */
export const RUTAS_PROTEGIDAS: Record<string, Permiso> = {
  '/admin/catalogo': 'catalogo:editar',
  '/admin/profesionales': 'equipo:editar',
  '/admin/clientas': 'clienta:leer',
  '/admin/agente': 'catalogo:editar',
}

/** La sesión, reducida a lo único que decide una ruta. */
export type SesionMinima = { rol?: string } | null

export type DecisionRuta =
  | { tipo: 'seguir' }
  | { tipo: 'a_login' }
  | { tipo: 'a_panel' }
  | { tipo: 'denegar' }

/**
 * Qué hacer con una petición al panel, aislada del contexto de Next.
 *
 * Existe separada por la misma razón que `decidirAcceso` en `withAuth`: `middleware()`
 * necesita un `NextRequest`, así que **no se puede probar desde un script** — y lo que no
 * se prueba, se rompe en silencio. Aquí se rompió: un desvío del rol `admin` dejó la
 * Agenda inalcanzable para la dueña durante un día entero, en producción, y ningún gate
 * lo vio porque el único que existía comprobaba la petición **sin sesión**.
 *
 * No hay copia de esta lógica en ningún lado: `middleware()` llama a esta función y
 * `scripts/prueba-rutas.ts` llama a esta misma función. Si cambia, cambian las dos a la
 * vez. Ver 04-BIBLIOTECA/patrones/guardianes-que-no-guardan.
 */
export function decidirRuta(pathname: string, session: SesionMinima): DecisionRuta {
  // El login es la única ruta del panel que se ve sin sesión.
  if (pathname === '/admin/login') {
    return session ? { tipo: 'a_panel' } : { tipo: 'seguir' }
  }

  if (!pathname.startsWith('/admin')) {
    return { tipo: 'seguir' }
  }

  if (!session) {
    return { tipo: 'a_login' }
  }

  for (const [ruta, permiso] of Object.entries(RUTAS_PROTEGIDAS)) {
    if (pathname.startsWith(ruta)) {
      const roles = PERMISOS[permiso] as readonly string[]
      if (!session.rol || !roles.includes(session.rol)) {
        return { tipo: 'denegar' }
      }
    }
  }

  // `/admin` es la Agenda y los tres roles tienen `agenda:leer`: nadie se desvía.
  return { tipo: 'seguir' }
}
