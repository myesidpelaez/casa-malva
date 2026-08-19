import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Las clases del botón, en un módulo SIN `'use client'`.
 *
 * Por qué separado de `button.tsx`: los Server Components (portada, catálogo)
 * necesitan estas clases para vestir un `<Link>`, y no pueden invocar una
 * función exportada desde un módulo de cliente. Aquí solo hay strings.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-semibold select-none cursor-pointer',
    'transition-[background-color,border-color,color,box-shadow] duration-200',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-malva-600',
    'disabled:pointer-events-none disabled:opacity-45',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-malva-600 text-white shadow-[var(--shadow-malva)]',
          'hover:bg-malva-700 active:bg-malva-800',
          'sheen',
        ],
        glass: [
          'glass glass-edge text-ink-900',
          'hover:bg-[var(--card)]/80 hover:shadow-[var(--shadow-e3)]',
        ],
        soft: [
          'bg-malva-100 text-malva-700 border border-malva-200/60',
          'hover:bg-malva-200/70',
        ],
        outline: [
          'border border-malva-300 bg-[var(--glass-tint)] text-malva-700 backdrop-blur-sm',
          'hover:bg-malva-50 hover:border-malva-400',
        ],
        ghost: ['text-ink-500 hover:bg-ink-100/50 hover:text-ink-900'],
        danger: [
          'bg-danger text-white shadow-[var(--shadow-e2)]',
          'hover:brightness-110 active:brightness-95',
        ],
        success: [
          'bg-success text-white shadow-[var(--shadow-e2)]',
          'hover:brightness-110 active:brightness-95',
        ],
      },
      size: {
        sm: 'h-9 rounded-[var(--radius-xs)] px-3.5 text-[13px]',
        md: 'h-11 rounded-[var(--radius-sm)] px-5 text-sm touch-target',
        lg: 'h-13 rounded-[var(--radius-md)] px-7 text-[15px] touch-target',
        xl: 'h-14 rounded-[var(--radius-lg)] px-8 text-base touch-target',
        icon: 'h-11 w-11 rounded-[var(--radius-sm)] p-0 touch-target',
        'icon-sm': 'h-9 w-9 rounded-[var(--radius-xs)] p-0',
      },
      full: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', full: false },
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>

/**
 * Clases de botón para elementos que NO son `<button>` — típicamente un
 * `<Link>` de Next, que debe seguir siendo un enlace de verdad para el teclado
 * y el clic derecho.
 */
export function buttonClass(opts: ButtonVariantProps & { className?: string } = {}) {
  const { className, ...variants } = opts
  return cn(buttonVariants(variants), className)
}
