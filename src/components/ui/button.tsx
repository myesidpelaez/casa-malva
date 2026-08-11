import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B4B6E] disabled:pointer-events-none disabled:opacity-50 touch-target cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-[#7B4B6E] text-white hover:bg-[#683d5d] active:bg-[#57324d]',
        secondary: 'bg-[#F3EAF0] text-[#7B4B6E] hover:bg-[#e8d8e3] active:bg-[#dcc7d6]',
        outline: 'border border-[#7B4B6E] text-[#7B4B6E] bg-transparent hover:bg-[#F3EAF0]',
        ghost: 'text-[#1A1618] hover:bg-[#F3EAF0] hover:text-[#7B4B6E]',
        destructive: 'bg-[#B4462F] text-white hover:bg-[#9a3b27]',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 rounded-md px-3.5 text-xs',
        lg: 'h-13 rounded-xl px-7 text-base',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
