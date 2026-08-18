'use client'

import * as React from 'react'
import { Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', callback)
  return () => {
    window.removeEventListener('storage', callback)
    media.removeEventListener('change', callback)
  }
}

function getSnapshot(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem('cm:tema')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getServerSnapshot(): 'light' | 'dark' {
  return 'light'
}

export function ThemeToggle({ className }: { className?: string }) {
  const tema = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const alternar = () => {
    const nuevoTema = tema === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', nuevoTema)
    localStorage.setItem('cm:tema', nuevoTema)
    window.dispatchEvent(new Event('storage'))
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={cn(
        'group relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink-100/80 bg-[var(--glass-tint)] text-ink-600 shadow-xs backdrop-blur-md transition-colors hover:border-malva-300 hover:text-malva-700 focus-visible:outline-2 focus-visible:outline-malva-600',
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {tema === 'dark' ? (
          <motion.span
            key="moon"
            initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.5, rotate: 45, opacity: 0 }}
            transition={spring.snappy}
            className="flex items-center justify-center text-malva-600"
          >
            <Moon className="h-4 w-4" strokeWidth={1.75} />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ scale: 0.5, rotate: 45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.5, rotate: 45, opacity: 0 }}
            transition={spring.snappy}
            className="flex items-center justify-center text-ink-600 group-hover:text-malva-700"
          >
            <Sun className="h-4 w-4" strokeWidth={1.75} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
