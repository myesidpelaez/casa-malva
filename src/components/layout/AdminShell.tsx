'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Bot,
  BookOpen,
  Calendar,
  LogOut,
  UserCheck,
  Users,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { logoutAction } from '@/actions/auth'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'
import { Button } from '@/components/ui/button'

type AdminNavItem = { label: string; href: string; icon: LucideIcon }

export const ADMIN_ITEMS: AdminNavItem[] = [
  { label: 'Agenda', href: '/admin', icon: Calendar },
  { label: 'Catálogo', href: '/admin/catalogo', icon: BookOpen },
  { label: 'Equipo', href: '/admin/profesionales', icon: Users },
  { label: 'Clientas', href: '/admin/clientas', icon: UserCheck },
  { label: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
  { label: 'Agente IA', href: '/admin/agente', icon: Bot },
]

function esActivo(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin' || pathname === '/admin/agenda'
  return pathname.startsWith(href)
}

/**
 * Contenedor del panel del estudio.
 *
 * La navegación vive aquí y en un solo sitio: en el mockup, las cinco páginas
 * del panel repetían su propia barra de pestañas copiada y pegada, y ya se
 * habían desincronizado entre sí.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [saliendo, setSaliendo] = React.useState(false)

  async function salir() {
    setSaliendo(true)
    await logoutAction()
    toast.success('Sesión cerrada')
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-dvh">
      {/* ---------- Barra lateral (escritorio) ---------- */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-malva-100/70 bg-white/55 p-3 backdrop-blur-xl md:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-2 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-malva-600 font-display text-base font-semibold text-white shadow-[var(--shadow-malva)]">
            M
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[16px] font-semibold text-ink-900">
              Casa Malva
            </span>
            <span className="block text-[11px] text-ink-400">Panel del estudio</span>
          </span>
        </Link>

        <nav className="mt-3 flex-1 space-y-1" aria-label="Panel">
          {ADMIN_ITEMS.map((item) => {
            const activo = esActivo(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
                  activo ? 'text-malva-700' : 'text-ink-500 hover:text-ink-900'
                )}
              >
                {activo && (
                  <motion.span
                    layoutId="admin-nav-active"
                    transition={spring.glide}
                    className="absolute inset-0 rounded-[var(--radius-sm)] bg-malva-100"
                  />
                )}
                <Icon
                  className="relative z-10 h-[18px] w-[18px]"
                  strokeWidth={activo ? 2 : 1.6}
                />
                <span className="relative z-10">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="space-y-1 border-t border-malva-100 pt-3">
          <Link
            href="/inicio"
            className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-[12.5px] font-semibold text-ink-400 transition-colors hover:text-malva-700"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Ver el sitio público
          </Link>
          <Button
            variant="ghost"
            size="sm"
            full
            loading={saliendo}
            onClick={salir}
            className="!justify-start !text-ink-400 hover:!text-danger"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* ---------- Contenido ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 py-[var(--spacing-fib-3)] pb-28 sm:px-[var(--spacing-fib-3)] md:pb-[var(--spacing-fib-4)]">
          {children}
        </main>
      </div>

      {/* ---------- Dock inferior (móvil) ---------- */}
      <nav
        aria-label="Panel"
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden"
      >
        <div className="glass-strong glass-edge mx-auto flex max-w-md items-center justify-around rounded-[var(--radius-xl)] p-1.5">
          {ADMIN_ITEMS.map((item) => {
            const activo = esActivo(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? 'page' : undefined}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-[var(--radius-md)] py-2 touch-target"
              >
                {activo && (
                  <motion.span
                    layoutId="admin-dock-active"
                    transition={spring.glide}
                    className="absolute inset-0 rounded-[var(--radius-md)] bg-malva-100"
                  />
                )}
                <Icon
                  className={cn(
                    'relative z-10 h-5 w-5',
                    activo ? 'text-malva-700' : 'text-ink-400'
                  )}
                  strokeWidth={activo ? 2 : 1.6}
                />
                <span
                  className={cn(
                    'relative z-10 text-[10px] font-semibold',
                    activo ? 'text-malva-700' : 'text-ink-400'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

/** Cabecera de página del panel: título, bajada y acciones a la derecha. */
export function AdminHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="mb-[var(--spacing-fib-3)] flex flex-col gap-3 border-b border-malva-100 pb-[var(--spacing-fib-2)] sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-[26px] font-semibold leading-tight text-ink-900">
          {title}
        </h1>
        {subtitle && <div className="mt-0.5 text-[13px] text-ink-500">{subtitle}</div>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  )
}
