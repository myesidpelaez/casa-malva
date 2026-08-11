'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GlassModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function GlassModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: GlassModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div
        className={cn(
          'w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white border border-[#F3EAF0] p-6 shadow-xl max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-[#F3EAF0] pb-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1A1618]">{title}</h3>
            {description && (
              <p className="text-sm text-[#6B6268] mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#6B6268] hover:bg-[#F3EAF0] hover:text-[#1A1618] transition-colors touch-target"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5 stroke-[1.5]" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}
