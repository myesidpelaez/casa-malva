'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { CalendarPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'
import { MarcaReveal } from '@/components/brand'
import { ThemeToggle } from '@/components/common/ThemeToggle'

const LINKS = [
  { href: '/inicio', label: 'Inicio' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/reservar', label: 'Reservar' },
]

/**
 * Barra superior Haute Couture con cristal líquido y acentos en oro editorial.
 */
export function TopBar() {
  const pathname = usePathname()
  const [condensada, setCondensada] = React.useState(false)

  React.useEffect(() => {
    const alScrollear = () => setCondensada(window.scrollY > 20)
    alScrollear()
    window.addEventListener('scroll', alScrollear, { passive: true })
    return () => window.removeEventListener('scroll', alScrollear)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300',
        condensada
          ? 'border-malva-200/80 dark:border-[#c5a059]/25 bg-white/85 dark:bg-[#120d11]/90 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)]'
          : 'border-transparent bg-white/50 dark:bg-[#120d11]/60 backdrop-blur-xl'
      )}
    >
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo & Marca con interacción botánica */}
        <Link href="/inicio" className="group flex items-center gap-3">
          <div className="shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-6">
            <MarcaReveal size={42} interactive className="text-malva-700 dark:text-[#c5a059] drop-shadow-xs" />
          </div>
          <span className="leading-tight">
            <span className="block font-display text-xl font-semibold tracking-tight text-ink-950 dark:text-[#fbf7fa] group-hover:text-malva-700 dark:group-hover:text-[#c5a059] transition-colors">
              Casa Malva
            </span>
            <span className="block text-xs tracking-wider uppercase text-ink-500 dark:text-[#c5a059]/80 font-medium">
              Estudio de belleza
            </span>
          </span>
        </Link>

        {/* Enlaces de Navegación */}
        <nav className="hidden items-center gap-1.5 md:flex" aria-label="Principal">
          {LINKS.map((link) => {
            const activo = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'relative rounded-full px-4.5 py-2 text-sm font-semibold transition-all duration-200',
                  activo
                    ? 'text-malva-900 dark:text-[#fbf7fa]'
                    : 'text-ink-600 dark:text-white/70 hover:text-ink-950 dark:hover:text-white'
                )}
              >
                {activo && (
                  <motion.span
                    layoutId="topbar-active"
                    transition={spring.glide}
                    className="absolute inset-0 rounded-full bg-malva-100/90 dark:bg-[#2a1a26] border border-malva-200/90 dark:border-[#c5a059]/40 shadow-xs"
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Acciones: Toggle de Tema + Botón Reservar */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/reservar"
            className="hidden sm:inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-malva-700 via-malva-800 to-malva-900 dark:from-[#3a1d33] dark:via-[#4d2644] dark:to-[#613056] text-white px-5 py-2.5 text-sm font-bold shadow-[0_4px_16px_rgba(102,61,91,0.25)] border border-malva-400/30 dark:border-[#c5a059]/40 hover:scale-[1.02] hover:shadow-[0_6px_24px_rgba(102,61,91,0.35)] active:scale-98 transition-all cursor-pointer"
          >
            <CalendarPlus className="h-4 w-4 text-[#c5a059]" strokeWidth={2} />
            <span>Reservar cita</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
