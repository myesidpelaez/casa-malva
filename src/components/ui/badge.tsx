import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#7B4B6E] text-white',
        secondary: 'border-transparent bg-[#F3EAF0] text-[#7B4B6E]',
        success: 'border-transparent bg-[#E8F5E9] text-[#2F7D5B]',
        alert: 'border-transparent bg-[#FDE8E8] text-[#B4462F]',
        outline: 'border-[#7B4B6E] text-[#7B4B6E]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
