'use client'

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { overlay } from '@/lib/motion'

export type RightDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
}

const drawerVariants: Variants = {
  hidden: { x: '100%', opacity: 0.8 },
  show: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 30, stiffness: 320 },
  },
  exit: {
    x: '100%',
    opacity: 0.8,
    transition: { ease: 'easeInOut', duration: 0.2 },
  },
}

const mobileSheetVariants: Variants = {
  hidden: { y: '100%', opacity: 1 },
  show: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 28, stiffness: 300 },
  },
  exit: {
    y: '100%',
    opacity: 1,
    transition: { ease: 'easeInOut', duration: 0.2 },
  },
}

export function RightDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: RightDrawerProps) {
  const [isDesktop, setIsDesktop] = React.useState(true)

  React.useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
                className="fixed inset-0 z-50 bg-ink-950/40 backdrop-blur-[5px]"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount>
              <motion.div
                variants={isDesktop ? drawerVariants : mobileSheetVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className={cn(
                  'fixed z-50 flex flex-col bg-[var(--card)] text-ink-900 shadow-2xl border-ink-100',
                  // Mobile: Bottom Sheet
                  'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[28px] border-t',
                  // Desktop: Right Drawer (Full Height, Cero Scroll)
                  'sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-full sm:h-full sm:w-full sm:rounded-none sm:border-l',
                  sizeClasses[size],
                  className
                )}
              >
                {/* Drag pill indicator on Mobile */}
                <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
                  <div className="h-1.5 w-12 rounded-full bg-ink-200" aria-hidden />
                </div>

                {/* Fixed Header */}
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-malva-100 px-6 py-4.5 bg-malva-50/40">
                  <div className="min-w-0 space-y-1">
                    <Dialog.Title className="font-display text-[20px] sm:text-[22px] font-semibold text-ink-900 leading-tight">
                      {title}
                    </Dialog.Title>
                    {description && (
                      <Dialog.Description className="text-[13px] leading-relaxed text-ink-500">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>

                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Cerrar panel"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--glass-tint-strong)] text-ink-500 hover:bg-malva-100 hover:text-ink-900 transition-colors border border-ink-100 shadow-sm"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Scrollable Body (Cero Scroll compliant: min-h-0 flex-1 overflow-y-auto) */}
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-malva px-6 py-5 space-y-5">
                  {children}
                </div>

                {/* Fixed Footer */}
                {footer && (
                  <div className="shrink-0 border-t border-malva-100 bg-malva-50/60 px-6 py-4 backdrop-blur-md">
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
