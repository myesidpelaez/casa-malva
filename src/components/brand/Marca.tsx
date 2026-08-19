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
   * @default 2.2
   */
  strokeWidth?: number
  /**
   * Modo de animación CSS progresiva (Spec 26).
   */
  animate?: 'reveal' | 'espera' | 'breathe' | 'bloom' | false
  /**
   * Activa micro-interacción botánica al pasar el cursor (hover).
   * @default false
   */
  interactive?: boolean
  /**
   * Renderiza un halo ambiental difuso detrás de la flor.
   * @default false
   */
  halo?: boolean
  className?: string
}

/**
 * Componente canónico de la marca Casa Malva: «La Vena» (Spec 26).
 *
 * Cinco pétalos hendidos armónicos rotados a 0/72/144/216/288° con núcleo central unificador.
 */
export function Marca({
  size = 36,
  variant = 'auto',
  color,
  strokeWidth = 2.2,
  animate = false,
  interactive = false,
  halo = false,
  className,
  ...rest
}: MarcaProps) {
  const varianteFinal: VarianteMarca =
    variant === 'auto' ? elegirVariante(size) : variant

  const petalos = obtenerPetalos()

  const svgContent = (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      aria-label="Casa Malva"
      className={cn(
        'inline-block shrink-0 overflow-visible',
        animate === 'reveal' && 'marca-reveal',
        animate === 'espera' && 'marca-espera',
        animate === 'breathe' && 'marca-breathe',
        animate === 'bloom' && 'marca-bloom',
        interactive && 'marca-interactive',
        className
      )}
      {...rest}
    >
      {varianteFinal === 'linea' ? (
        <g className="petal-grp" style={{ transformOrigin: '32px 32px' }}>
          <g
            stroke={color ?? 'currentColor'}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            fill={color ?? 'currentColor'}
            fillOpacity={0.16}
          >
            {petalos.map((p, idx) => (
              <path
                key={p.rotacion}
                d={p.d}
                transform={p.transform}
                className={cn(
                  'marca-petal',
                  animate === 'reveal' && `marca-petal-reveal delay-${idx + 1}`,
                  animate === 'espera' && `marca-petal-seq delay-${idx + 1}`,
                  animate === 'bloom' && `marca-petal-reveal delay-${idx + 1}`
                )}
              />
            ))}
          </g>
          <circle cx="32" cy="32" r="3.5" fill={color ?? 'currentColor'} />
        </g>
      ) : (
        <g className="petal-grp" style={{ transformOrigin: '32px 32px' }}>
          <g fill={color ?? 'currentColor'}>
            {petalos.map((p, idx) => (
              <path
                key={p.rotacion}
                d={p.d}
                transform={p.transform}
                className={cn(
                  'marca-petal',
                  animate === 'reveal' && `marca-petal-reveal-solid delay-${idx + 1}`,
                  animate === 'espera' && `marca-petal-seq delay-${idx + 1}`,
                  animate === 'bloom' && `marca-petal-reveal-solid delay-${idx + 1}`
                )}
              />
            ))}
          </g>
          <circle cx="32" cy="32" r="3.8" fill="var(--card, #ffffff)" />
        </g>
      )}
    </svg>
  )

  if (halo) {
    return (
      <div className="marca-halo-container">
        <div className="marca-halo-backdrop" />
        {svgContent}
      </div>
    )
  }

  return svgContent
}
