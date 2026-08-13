'use client'

import * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'
import { buttonVariants, type ButtonVariantProps } from './button-variants'

/**
 * El botón de Casa Malva.
 *
 * Tres cosas lo separan de un `<button>` con clases:
 *   1. Física de pulsación (escala con muelle) — se siente como un objeto.
 *   2. Estado `loading` de primera clase: bloquea, conserva el ancho y no
 *      deja que el texto salte. Un botón que cambia de tamaño al enviar es
 *      el detalle que delata a un prototipo.
 *   3. Material: el primario es malva con brillo; el resto es vidrio.
 *
 * Para vestir un `<Link>` con este aspecto, usa `buttonClass()` de
 * `./button-variants` — ese módulo sí se puede leer desde el servidor.
 *
 * Especificación: docs/specs/10-sistema-diseno.md §5
 */
export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    ButtonVariantProps {
  loading?: boolean
  /** Texto mientras `loading` está activo. Si se omite, conserva el original. */
  loadingText?: string
  children?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      full,
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => (
    <motion.button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, full }), className)}
      whileHover={disabled || loading ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97, y: 0 }}
      transition={spring.snappy}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
      <span className="relative z-[2] inline-flex items-center gap-2">
        {loading && loadingText ? loadingText : children}
      </span>
    </motion.button>
  )
)
Button.displayName = 'Button'

export { buttonVariants }
// `buttonClass` NO se reexporta aquí a propósito: importarlo desde este módulo
// arrastraría la frontera de cliente a cualquier página de servidor que lo use.
// Impórtalo siempre desde '@/components/ui/button-variants'.
