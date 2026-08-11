'use client'

import Link from 'next/link'
import { Sparkles, CalendarPlus } from 'lucide-react'

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#F3EAF0] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/inicio" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7B4B6E] text-white font-semibold text-base transition-transform group-hover:scale-105">
            M
          </div>
          <div>
            <span className="font-semibold text-lg tracking-tight text-[#1A1618] block leading-tight">
              Casa Malva
            </span>
            <span className="text-xs text-[#6B6268] font-normal block leading-none">
              Estudio de belleza
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/servicios"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B6268] hover:text-[#7B4B6E] transition-colors px-3 py-2"
          >
            <Sparkles className="h-4 w-4 stroke-[1.5]" />
            <span>Servicios</span>
          </Link>
          <Link
            href="/reservar"
            className="inline-flex items-center gap-2 rounded-lg bg-[#7B4B6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#683d5d] active:bg-[#57324d] transition-colors touch-target"
          >
            <CalendarPlus className="h-4 w-4 stroke-[1.5]" />
            <span>Reservar cita</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
