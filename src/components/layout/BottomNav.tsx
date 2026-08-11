'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Sparkles, CalendarPlus, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  const items = [
    { label: 'Inicio', href: '/inicio', icon: Home },
    { label: 'Catálogo', href: '/servicios', icon: Sparkles },
    { label: 'Reservar', href: '/reservar', icon: CalendarPlus },
    { label: 'Admin', href: '/admin', icon: Shield },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#F3EAF0] bg-white/95 backdrop-blur-md sm:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/inicio' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full py-1 text-xs font-semibold transition-colors touch-target',
                isActive
                  ? 'text-[#7B4B6E]'
                  : 'text-[#6B6268] hover:text-[#1A1618]'
              )}
            >
              <Icon className="h-5 w-5 stroke-[1.5] mb-1" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
