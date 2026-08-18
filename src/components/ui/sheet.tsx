'use client'

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { overlay, sheet as sheetVariants, spring } from '@/lib/motion'
import { Button } from './button'

/**
 * Hoja modal de vidrio.
 *
 * Se apoya en Radix Dialog por lo que no se ve: atrapa el foco, cierra con
 * Escape, bloquea el scroll de fondo y anuncia rol y título al lector de
 * pantalla. Encima va el material y el muelle.
 *
 * En móvil entra desde abajo y se puede arrastrar para cerrar — el gesto que
 * cualquiera que use un iPhone ya tiene en los dedos.
 *
 * Especificación: docs/specs/10-sistema-diseno.md §7
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const maxW = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size]

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                variants={overlay}
                initial="hidden"
                animate="show"
                exit="exit"
                className="fixed inset-0 z-50 bg-ink-900/30 backdrop-blur-[6px]"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount>
              <motion.div
                variants={sheetVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.4 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 120 || info.velocity.y > 600) onOpenChange(false)
                }}
                className={cn(
                  'glass-strong glass-edge fixed z-50 flex flex-col',
                  // Móvil: hoja anclada abajo, esquinas superiores redondeadas.
                  'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[var(--radius-xl)]',
                  // Escritorio: diálogo centrado.
                  'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2',
                  'sm:max-h-[86vh] sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2',
                  'sm:rounded-[var(--radius-xl)]',
                  maxW
                )}
              >
                {/* Asa de arrastre: solo móvil, solo señal visual */}
                <div className="flex shrink-0 justify-center pt-3 sm:hidden">
                  <div className="h-1 w-10 rounded-full bg-ink-200" aria-hidden />
                </div>

                <div className="flex shrink-0 items-start justify-between gap-4 px-[var(--spacing-fib-3)] pb-[var(--spacing-fib-2)] pt-[var(--spacing-fib-3)]">
                  <div className="min-w-0 space-y-1">
                    <Dialog.Title className="font-display text-xl font-semibold text-ink-900">
                      {title}
                    </Dialog.Title>
                    {description ? (
                      <Dialog.Description className="text-[13px] leading-relaxed text-ink-500">
                        {description}
                      </Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                  </div>

                  <Dialog.Close asChild>
                    <motion.button
                      whileHover={{ scale: 1.08, rotate: 90 }}
                      whileTap={{ scale: 0.92 }}
                      transition={spring.snappy}
                      aria-label="Cerrar"
                      className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                    >
                      <X className="h-[18px] w-[18px]" strokeWidth={2} />
                    </motion.button>
                  </Dialog.Close>
                </div>

                <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-[var(--spacing-fib-3)] pb-[var(--spacing-fib-3)]">
                  {children}
                </div>

                {footer && (
                  <div className="shrink-0 border-t border-ink-100/80 bg-[var(--glass-tint)] px-[var(--spacing-fib-3)] py-[var(--spacing-fib-2)] pb-[max(var(--spacing-fib-2),env(safe-area-inset-bottom))]">
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

/**
 * Diálogo de confirmación. Existe para no volver a usar `confirm()` nativo:
 * un `confirm()` del navegador delante de un cliente rompe la ilusión de
 * producto terminado en un segundo.
 */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  loading = false,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  children?: React.ReactNode
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button
            variant="glass"
            full
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            full
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {children}
    </Sheet>
  )
}
