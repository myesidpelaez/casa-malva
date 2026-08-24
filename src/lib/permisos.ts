import type { AuthContext } from './withAuth'

export type Rol = 'admin' | 'recepcion' | 'profesional'

export const PERMISOS = {
  'agenda:leer':          ['admin', 'recepcion', 'profesional'],
  'cita:cambiar_estado':  ['admin', 'recepcion', 'profesional'],
  'cita:reagendar':       ['admin', 'recepcion'],
  'cita:crear':           ['admin', 'recepcion'],
  'cobro:registrar':      ['admin', 'recepcion'],
  'cobro:leer':           ['admin'],
  'clienta:leer':         ['admin', 'recepcion'],
  'clienta:crear':        ['admin', 'recepcion'],
  'clienta:fusionar':     ['admin'],
  'catalogo:editar':      ['admin'],
  'equipo:editar':        ['admin'],
} as const satisfies Record<string, readonly Rol[]>

export type Permiso = keyof typeof PERMISOS

export function puedeTocarCita(ctx: AuthContext, cita: { professionalId: string }): boolean {
  if (ctx.rol === 'admin' || ctx.rol === 'recepcion') return true
  if (ctx.rol === 'profesional') return cita.professionalId === ctx.professionalId
  return false
}
