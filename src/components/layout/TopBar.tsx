'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { CalendarPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonClass } from '@/components/ui/button-variants'
import { spring } from '@/lib/motion'

const LINKS = [
  { href: '/inicio', label: 'Inicio' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/reservar', label: 'Reservar' },
]

/**
 * Barra superior de vidrio.
 *
 * Al bajar se condensa: más tinte y aparece la línea inferior, como la barra de
 * navegación de iOS.
 *
 * **El estado base ya es vidrio legible, no transparente.** Es deliberado: si el
 * oyente de scroll no llegara a dispararse nunca —navegador raro, pestaña en
 * segundo plano, un fallo futuro— la barra se queda condensada de menos, no
 * invisible sobre el contenido. El efecto es una mejora, no un requisito.
 */
export function TopBar() {
  const pathname = usePathname()
  const [condensada, setCondensada] = React.useState(false)

  React.useEffect(() => {
    const alScrollear = () => setCondensada(window.scrollY > 24)
    alScrollear()
    window.addEventListener('scroll', alScrollear, { passive: true })
    return () => window.removeEventListener('scroll', alScrollear)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b transition-[background-color,border-color,box-shadow] duration-300',
        'bg-white/55 backdrop-blur-xl backdrop-saturate-150',
        condensada
          ? 'border-malva-100 bg-white/75 shadow-[var(--shadow-e1)]'
          : 'border-transparent'
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/inicio" className="group flex items-center gap-3">
          <motion.span
            whileHover={{ rotate: -6, scale: 1.06 }}
            transition={spring.snappy}
            className="grid h-10 w-10 place-items-center rounded-[14px] bg-malva-600 font-display text-lg font-semibold text-white shadow-[var(--shadow-malva)]"
          >
            M
          </motion.span>
          <span className="leading-tight">
            <span className="block font-display text-[19px] font-semibold tracking-tight text-ink-900">
              Casa Malva
            </span>
            <span className="block text-[11.5px] tracking-wide text-ink-400">
              Estudio de belleza
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {LINKS.map((link) => {
            const activo = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'relative rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors',
                  activo ? 'text-malva-700' : 'text-ink-500 hover:text-ink-900'
                )}
              >
                {activo && (
                  <motion.span
                    layoutId="topbar-active"
                    transition={spring.glide}
                    className="absolute inset-0 rounded-full bg-malva-100"
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <Link
          href="/reservar"
          className={cn(
            buttonClass({ variant: 'primary', size: 'md' }),
            'hidden sm:inline-flex'
          )}
        >
          <CalendarPlus className="h-4 w-4" strokeWidth={1.75} />
          <span>Reservar cita</span>
        </Link>
      </div>
    </header>
  )
}
