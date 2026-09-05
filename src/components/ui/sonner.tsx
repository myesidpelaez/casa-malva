'use client'

import { Toaster } from 'sonner'

/**
 * Avisos. Reemplazan por completo a `alert()`.
 *
 * Se colocan abajo en móvil (donde está el pulgar) y arriba a la derecha en
 * escritorio, con el mismo material de vidrio que el resto de la interfaz.
 */
export function SonnerToaster() {
  return (
    <Toaster
      position="top-center"
      offset={16}
      expand={false}
      closeButton
      duration={4200}
      toastOptions={{
        classNames: {
          toast:
            'glass-strong glass-edge !rounded-[var(--radius-md)] !border-transparent !shadow-[var(--shadow-e3)] !font-sans !text-ink-900',
          title: '!text-sm !font-semibold',
          description: '!text-xs !text-ink-500',
          actionButton: '!bg-malva-600 !text-white !rounded-[var(--radius-xs)]',
          cancelButton: '!bg-ink-100 !text-ink-700 !rounded-[var(--radius-xs)]',
          closeButton: '!bg-white/80 !border-ink-200 !text-ink-500',
          success: '![--normal-text:var(--color-success)]',
          error: '![--normal-text:var(--color-danger)]',
        },
      }}
    />
  )
}
