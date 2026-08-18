'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tween } from '@/lib/motion'

/**
 * Campo de formulario con etiqueta, icono, ayuda y error.
 *
 * El error se anuncia con `aria-invalid` + `aria-describedby` y aparece con
 * una animación de altura: sin salto de layout, que es lo que hace que un
 * formulario se sienta barato.
 *
 * Especificación: docs/specs/10-sistema-diseno.md §6
 */

const inputBase = [
  'w-full bg-[var(--glass-tint)] backdrop-blur-sm text-ink-900',
  'border border-ink-200/80 rounded-[var(--radius-sm)]',
  'placeholder:text-ink-400',
  'transition-[border-color,box-shadow,background-color] duration-200',
  'hover:border-ink-300',
  'focus:outline-none focus:border-malva-500 focus:bg-[var(--card)]',
  'focus:shadow-[0_0_0_4px_rgba(123,75,110,0.1)]',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ')

export type FieldProps = {
  label?: string
  hint?: string
  error?: string | null
  icon?: LucideIcon
  suffix?: React.ReactNode
  required?: boolean
  className?: string
  children?: never
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>

export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, icon: Icon, suffix, required, className, id, ...props }, ref) => {
    const autoId = React.useId()
    const inputId = id ?? autoId
    const hintId = `${inputId}-hint`
    const errorId = `${inputId}-error`

    return (
      <div className={cn('space-y-1.5', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-semibold text-ink-700"
          >
            {label}
            {required && <span className="ml-0.5 text-malva-500">*</span>}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <Icon
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              strokeWidth={1.75}
              aria-hidden
            />
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            aria-required={required || undefined}
            className={cn(
              inputBase,
              'h-12 px-4 text-[15px]',
              Icon && 'pl-10',
              suffix && 'pr-16',
              error && 'border-danger focus:border-danger focus:shadow-[0_0_0_4px_rgba(180,70,47,0.12)]'
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-ink-400">
              {suffix}
            </div>
          )}
        </div>

        <AnimatePresence initial={false} mode="wait">
          {error ? (
            <motion.p
              key="error"
              id={errorId}
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={tween.fast}
              className="flex items-center gap-1.5 overflow-hidden text-[12px] font-medium text-danger"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {error}
            </motion.p>
          ) : hint ? (
            <p key="hint" id={hintId} className="text-[12px] text-ink-400">
              {hint}
            </p>
          ) : null}
        </AnimatePresence>
      </div>
    )
  }
)
Field.displayName = 'Field'

/** Interruptor estilo iOS. Se usa para activar/desactivar servicios y equipo. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
  disabled?: boolean
  id?: string
}) {
  const autoId = React.useId()
  const switchId = id ?? autoId

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label
          htmlFor={switchId}
          className="block cursor-pointer text-[13px] font-semibold text-ink-700"
        >
          {label}
        </label>
        {description && <p className="text-[12px] text-ink-400">{description}</p>}
      </div>

      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-[30px] w-[52px] shrink-0 rounded-full p-[3px] transition-colors duration-300',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-malva-600',
          checked ? 'bg-malva-600' : 'bg-ink-200',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 620, damping: 34 }}
          className="block h-6 w-6 rounded-full bg-white shadow-[0_2px_5px_rgba(26,22,24,0.22)]"
          style={{ marginLeft: checked ? 22 : 0 }}
        />
      </button>
    </div>
  )
}

/** Selector nativo, vestido con el mismo material que `Field`. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  { label?: string; hint?: string; className?: string } & React.SelectHTMLAttributes<HTMLSelectElement>
>(({ label, hint, className, id, children, ...props }, ref) => {
  const autoId = React.useId()
  const selectId = id ?? autoId
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={selectId} className="block text-[13px] font-semibold text-ink-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(inputBase, 'h-12 appearance-none px-4 text-[15px]')}
        {...props}
      >
        {children}
      </select>
      {hint && <p className="text-[12px] text-ink-400">{hint}</p>}
    </div>
  )
})
Select.displayName = 'Select'

export { inputBase }
