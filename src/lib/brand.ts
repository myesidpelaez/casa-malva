/**
 * Datos de marca centralizados de Casa Malva.
 *
 * Un solo lugar para las URLs de redes sociales, nombre del negocio,
 * y constantes de identidad visual que no son tokens CSS.
 *
 * Regla: si un dato aparece en más de un componente, vive aquí.
 */

export const MARCA = {
  nombre: 'Casa Malva',
  nombreCompleto: 'Casa Malva · Estudio de Belleza',
  ciudad: 'Medellín',
  timezone: 'America/Bogota',
} as const

/**
 * URLs de redes sociales.
 *
 * TODO: Reemplazar con las URLs reales cuando Mario las confirme.
 * Mientras tanto, apuntan a las cuentas mencionadas en las instrucciones
 * de diseño (sin verificar — los handles son los que pidió Mario).
 */
export const REDES_SOCIALES = {
  instagram: {
    url: 'https://instagram.com/casamalva.medellin',
    handle: '@casamalva.medellin',
    label: 'Instagram de Casa Malva',
  },
  tiktok: {
    url: 'https://tiktok.com/@casamalva',
    handle: '@casamalva',
    label: 'TikTok de Casa Malva',
  },
  facebook: {
    url: 'https://facebook.com/casamalva.estudio',
    handle: 'Casa Malva Estudio',
    label: 'Facebook de Casa Malva',
  },
} as const

export type RedSocial = keyof typeof REDES_SOCIALES
