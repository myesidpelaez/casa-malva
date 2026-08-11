import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-lg border border-[#e2d5de] bg-white px-3.5 py-2 text-sm text-[#1A1618] placeholder:text-[#6B6268] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B4B6E] disabled:cursor-not-allowed disabled:opacity-50 touch-target',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
