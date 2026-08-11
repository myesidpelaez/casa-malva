'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ADMIN_NAV } from '@/config/navigation'
import {
  Calendar,
  BookOpen,
  Users,
  UserCheck,
  Bot,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap = {
  Calendar,
  BookOpen,
  Users,
  UserCheck,
  Bot,
}

export function SideNav() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-[#F3EAF0] bg-white min-h-screen p-4 flex flex-col justify-between hidden md:flex">
      <div>
        <div className="flex items-center gap-3 px-3 py-3 mb-6 border-b border-[#F3EAF0]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7B4B6E] text-white font-semibold text-base">
            M
          </div>
          <div>
            <h2 className="font-semibold text-base text-[#1A1618]">Casa Malva</h2>
            <p className="text-xs text-[#6B6268]">Panel de Administración</p>
          </div>
        </div>

        <nav className="space-y-1">
          {ADMIN_NAV.map((item) => {
            const Icon = iconMap[item.iconName as keyof typeof iconMap] || Calendar
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors touch-target',
                  isActive
                    ? 'bg-[#F3EAF0] text-[#7B4B6E]'
                    : 'text-[#6B6268] hover:bg-[#FAF8F9] hover:text-[#1A1618]'
                )}
              >
                <Icon className="h-4 w-4 stroke-[1.5]" />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-[#F3EAF0]">
        <Link
          href="/inicio"
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#6B6268] hover:text-[#7B4B6E] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
          <span>Volver al sitio público</span>
        </Link>
      </div>
    </aside>
  )
}
