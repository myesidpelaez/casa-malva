'use client'

import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const SonnerToaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-[#1A1618] group-[.toaster]:border-[#F3EAF0] group-[.toaster]:shadow-sm font-sans',
          description: 'group-[.toast]:text-[#6B6268]',
          actionButton:
            'group-[.toast]:bg-[#7B4B6E] group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-[#F3EAF0] group-[.toast]:text-[#7B4B6E]',
        },
      }}
      {...props}
    />
  )
}

export { SonnerToaster }
