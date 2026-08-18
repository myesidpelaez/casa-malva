/**
 * Fuente única de geometría y lógica para la marca Casa Malva: «La Vena» (Spec 26).
 *
 * La flor de la malva sylvestris tiene 5 pétalos hendidos (con muesca botánica).
 * La geometría es una constante rotada en 5 pasos de 72° alrededor de (32, 32).
 */

export const ROTACIONES_PETALOS = [0, 72, 144, 216, 288] as const

/**
 * Trazo canónico del pétalo vertical orientado hacia arriba:
 * - Arranca en la base (32, 33)
 * - Curva lateral izquierda hacia la punta izquierda (28.5, 9.5)
 * - Hendidura botánica central hacia adentro (32, 13.5) [7 unidades de ancho, 4 de fondo]
 * - Punta derecha (35.5, 9.5)
 * - Curva lateral derecha de regreso a la base (32, 33)
 */
export const PETALO_D =
  'M32,33 C23,29 20,19 28.5,9.5 L32,13.5 L35.5,9.5 C44,19 41,29 32,33 Z'

export type VarianteMarca = 'linea' | 'solida'

/**
 * Decide la variante óptima según el tamaño en píxeles.
 * D2: Umbral en 28 px.
 *
 * Trazo real = 2.6 × px / 64:
 * - >= 28 px: trazo >= 1.14 px -> variante 'linea'
 * - < 28 px: trazo < 1.14 px -> variante 'solida' (evita que el navegador difumine a gris)
 *
 * Falla cerrado: rechaza 0, negativos y NaN con excepción.
 */
export function elegirVariante(px: number): VarianteMarca {
  if (typeof px !== 'number' || isNaN(px) || !isFinite(px) || px <= 0) {
    throw new Error(`Tamaño de marca inválido: ${px}. Debe ser un número positivo finito.`)
  }
  return px >= 28 ? 'linea' : 'solida'
}

/**
 * Decide si la revelación debe correr. Función pura: toda la E/S
 * (`sessionStorage`, `matchMedia`) la hace quien la llama.
 *
 * D4: una vez por sesión. Y nunca si la persona pidió menos movimiento.
 *
 * Existe separada (regla 5: separar el plan de la ejecución) porque la versión
 * anterior mezclaba la decisión con la escritura en `sessionStorage` dentro de
 * un `getSnapshot`, y eso rompió la revelación sin que ningún gate lo notara.
 * Aquí la decisión se puede probar sin navegador.
 */
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

/**
 * Devuelve los 5 pétalos con sus transformaciones de rotación sobre (32, 32).
 */
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

/**
 * Genera el SVG en variante línea (trazo).
 */
export function generarSvgLinea(opciones: SvgOpciones = {}): string {
  const color = opciones.color ?? '#7b4b6e'
  const strokeWidth = opciones.strokeWidth ?? 2.6
  const classNameAttr = opciones.className ? ` class="${opciones.className}"` : ''
  const idAttr = opciones.id ? ` id="${opciones.id}"` : ''

  const paths = ROTACIONES_PETALOS.map((rot) => {
    const transform = rot === 0 ? '' : ` transform="rotate(${rot} 32 32)"`
    return `    <path d="${PETALO_D}"${transform} />`
  }).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"${idAttr}${classNameAttr} aria-label="Casa Malva">
  <g stroke="${color}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round">
${paths}
  </g>
</svg>`
}

/**
 * Genera el SVG en variante sólida (relleno).
 */
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
</svg>`
}

/**
 * Generador maestro según variante.
 */
export function generarSvgMarca(
  variante: VarianteMarca,
  opciones: SvgOpciones = {}
): string {
  return variante === 'linea'
    ? generarSvgLinea(opciones)
    : generarSvgSolida(opciones)
}

/**
 * Función pura: devuelve el mapa de rutas relativas y su contenido SVG exacto (D7).
 * No toca disco ni red.
 */
export function construirFicheros(): Map<string, string> {
  const mapa = new Map<string, string>()

  mapa.set('public/marca/la-vena-linea.svg', generarSvgLinea({ color: '#7b4b6e', strokeWidth: 2.6 }))
  mapa.set('public/marca/la-vena-solida.svg', generarSvgSolida({ color: '#7b4b6e' }))
  mapa.set('src/app/icon.svg', generarSvgSolida({ color: '#7b4b6e' }))

  return mapa
}
