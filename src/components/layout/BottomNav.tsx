'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { CalendarPlus, Home, Shield, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'

type Item = { label: string; href: string; icon: LucideIcon }

const PUBLIC_ITEMS: Item[] = [
  { label: 'Inicio', href: '/inicio', icon: Home },
  { label: 'Servicios', href: '/servicios', icon: Sparkles },
  { label: 'Reservar', href: '/reservar', icon: CalendarPlus },
  { label: 'Panel', href: '/admin', icon: Shield },
]

/**
 * Dock inferior flotante para móvil.
 *
 * No está pegado al borde: flota sobre el contenido con margen y esquinas
 * redondeadas, respetando el área segura del iPhone. La pastilla activa se
 * desliza entre pestañas con `layoutId`.
 */
export function BottomNav({ items = PUBLIC_ITEMS }: { items?: Item[] }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="glass-strong glass-edge mx-auto flex max-w-md items-center justify-around rounded-[var(--radius-xl)] p-1.5">
        {items.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href !== '/inicio' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-[var(--radius-md)] py-2 touch-target"
            >
              {active && (
                <motion.span
                  layoutId="bottomnav-active"
                  transition={spring.glide}
                  className="absolute inset-0 rounded-[var(--radius-md)] bg-malva-100"
                />
              )}
              <motion.span
                animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
                transition={spring.snappy}
                className="relative z-10"
              >
                <Icon
                  className={cn('h-5 w-5', active ? 'text-malva-700' : 'text-ink-400')}
                  strokeWidth={active ? 2 : 1.6}
                />
              </motion.span>
              <span
                className={cn(
                  'relative z-10 text-2xs font-semibold',
                  active ? 'text-malva-700' : 'text-ink-400'
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export { PUBLIC_ITEMS }
