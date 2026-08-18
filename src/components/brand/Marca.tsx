import * as React from 'react'
import { elegirVariante, obtenerPetalos, type VarianteMarca } from '@/lib/marca'
import { cn } from '@/lib/utils'

export interface MarcaProps extends React.SVGProps<SVGSVGElement> {
  /**
   * Tamaño en píxeles (ancho y alto).
   * Determina automáticamente la variante óptima si variant='auto' (umbral 28 px).
   * @default 36
   */
  size?: number
  /**
   * Variante geométrica. 'auto' usa elegirVariante(size).
   * @default 'auto'
   */
  variant?: 'auto' | VarianteMarca
  /**
   * Color de trazo o relleno. Si no se define, hereda currentColor.
   */
  color?: string
  /**
   * Grosor de trazo en variante línea (sobre escala base de 64).
   * @default 2.6
   */
  strokeWidth?: number
  /**
   * Modo de animación CSS progresiva (D3 / D4 / D5).
   * Visible por defecto aunque no corran fotogramas.
   */
  animate?: 'reveal' | 'espera' | false
  className?: string
}

/**
 * Componente canónico de la marca Casa Malva: «La Vena» (Spec 26).
 *
 * Cinco pétalos hendidos rotados a 0/72/144/216/288° derivados de src/lib/marca.ts.
 */
export function Marca({
  size = 36,
  variant = 'auto',
  color,
  strokeWidth = 2.6,
  animate = false,
  className,
  ...rest
}: MarcaProps) {
  const varianteFinal: VarianteMarca =
    variant === 'auto' ? elegirVariante(size) : variant

  const petalos = obtenerPetalos()

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      aria-label="Casa Malva"
      className={cn(
        'inline-block shrink-0',
        animate === 'reveal' && 'marca-reveal',
        animate === 'espera' && 'marca-espera',
        className
      )}
      {...rest}
    >
      {varianteFinal === 'linea' ? (
        <g
          stroke={color ?? 'currentColor'}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="petal-grp"
        >
          {petalos.map((p, idx) => (
            <path
              key={p.rotacion}
              d={p.d}
              transform={p.transform}
              className={cn(
                'marca-petal',
                animate === 'reveal' && `marca-petal-reveal delay-${idx + 1}`,
                animate === 'espera' && `marca-petal-seq delay-${idx + 1}`
              )}
            />
          ))}
        </g>
      ) : (
        <g fill={color ?? 'currentColor'} className="petal-grp">
          {petalos.map((p, idx) => (
            <path
              key={p.rotacion}
              d={p.d}
              transform={p.transform}
              className={cn(
                'marca-petal',
                animate === 'reveal' && `marca-petal-reveal-solid delay-${idx + 1}`,
                animate === 'espera' && `marca-petal-seq delay-${idx + 1}`
              )}
            />
          ))}
        </g>
      )}
    </svg>
  )
}
