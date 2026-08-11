import type { Metadata } from 'next'
import { Fraunces } from 'next/font/google'
import './globals.css'
import { SonnerToaster } from '@/components/ui/sonner'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Casa Malva · Estudio de belleza',
  description: 'Estudio de belleza en Laureles, Medellín. Reserva tu experiencia.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={fraunces.variable}>
      <body className="bg-[#FAF8F9] text-[#1A1618] antialiased selection:bg-[#F3EAF0] selection:text-[#7B4B6E]">
        {children}
        <SonnerToaster />
      </body>
    </html>
  )
}
