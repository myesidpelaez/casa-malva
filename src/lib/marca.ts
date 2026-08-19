/**
 * Fuente única de geometría y lógica para la marca Casa Malva: «La Vena» (Spec 26).
 *
 * La flor de la malva sylvestris tiene 5 pétalos hendidos cordiformes (con muesca botánica).
 * La geometría es una constante rotada en 5 pasos de 72° alrededor de (32, 32).
 */

export const ROTACIONES_PETALOS = [0, 72, 144, 216, 288] as const

/**
 * Trazo botánico armónico del pétalo cordiforme orientado hacia arriba:
 * - Base suave cerca del núcleo central (32, 31)
 * - Curva lateral izquierda hacia la corona (26.5, 8.5)
 * - Hendidura botánica superior suave (32, 12)
 * - Corona derecha (37.5, 8.5)
 * - Curva lateral derecha de regreso a la base (32, 31)
 */
export const PETALO_D =
  'M 32 31 C 24 28, 22 17, 26.5 8.5 C 29 11.5, 30.5 12, 32 12 C 33.5 12, 35 11.5, 37.5 8.5 C 42 17, 40 28, 32 31 Z'

export type VarianteMarca = 'linea' | 'solida'

/**
 * Decide la variante óptima según el tamaño en píxeles.
 * D2: Umbral en 28 px.
 */
export function elegirVariante(px: number): VarianteMarca {
  if (typeof px !== 'number' || isNaN(px) || !isFinite(px) || px <= 0) {
    throw new Error(`Tamaño de marca inválido: ${px}. Debe ser un número positivo finito.`)
  }
  return px >= 28 ? 'linea' : 'solida'
}

export function decidirRevelacion(
  yaRevelada: boolean,
  prefiereReducido: boolean
): boolean {
  return !yaRevelada && !prefiereReducido
}

export interface PetaloGeometria {
  d: string
  rotacion: number
  transform?: string
}

export function obtenerPetalos(): PetaloGeometria[] {
  return ROTACIONES_PETALOS.map((rotacion) => ({
    d: PETALO_D,
    rotacion,
    transform: rotacion === 0 ? undefined : `rotate(${rotacion} 32 32)`,
  }))
}

export interface SvgOpciones {
  color?: string
  strokeWidth?: number
  className?: string
  id?: string
}

export function generarSvgLinea(opciones: SvgOpciones = {}): string {
  const color = opciones.color ?? '#7b4b6e'
  const strokeWidth = opciones.strokeWidth ?? 2.2
  const classNameAttr = opciones.className ? ` class="${opciones.className}"` : ''
  const idAttr = opciones.id ? ` id="${opciones.id}"` : ''

  const paths = ROTACIONES_PETALOS.map((rot) => {
    const transform = rot === 0 ? '' : ` transform="rotate(${rot} 32 32)"`
    return `    <path d="${PETALO_D}"${transform} />`
  }).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"${idAttr}${classNameAttr} aria-label="Casa Malva">
  <g stroke="${color}" stroke-width="${strokeWidth}" stroke-linejoin="round" fill="${color}" fill-opacity="0.16">
${paths}
  </g>
  <circle cx="32" cy="32" r="3.5" fill="${color}" />
</svg>`
}

export function generarSvgSolida(opciones: SvgOpciones = {}): string {
  const color = opciones.color ?? '#7b4b6e'
  const classNameAttr = opciones.className ? ` class="${opciones.className}"` : ''
  const idAttr = opciones.id ? ` id="${opciones.id}"` : ''

  const paths = ROTACIONES_PETALOS.map((rot) => {
    const transform = rot === 0 ? '' : ` transform="rotate(${rot} 32 32)"`
    return `    <path d="${PETALO_D}"${transform} />`
  }).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"${idAttr}${classNameAttr} aria-label="Casa Malva">
  <g fill="${color}">
${paths}
  </g>
  <circle cx="32" cy="32" r="4" fill="#ffffff" />
</svg>`
}

export function generarSvgMarca(
  variante: VarianteMarca,
  opciones: SvgOpciones = {}
): string {
  return variante === 'linea'
    ? generarSvgLinea(opciones)
    : generarSvgSolida(opciones)
}

export function construirFicheros(): Map<string, string> {
  const mapa = new Map<string, string>()

  mapa.set('public/marca/la-vena-linea.svg', generarSvgLinea({ color: '#7b4b6e', strokeWidth: 2.2 }))
  mapa.set('public/marca/la-vena-solida.svg', generarSvgSolida({ color: '#7b4b6e' }))
  mapa.set('src/app/icon.svg', generarSvgSolida({ color: '#7b4b6e' }))

  return mapa
}
