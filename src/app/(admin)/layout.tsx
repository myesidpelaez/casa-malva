'use client'

import { usePathname } from 'next/navigation'
import { AdminShell } from '@/components/layout/AdminShell'

/**
 * El inicio de sesión vive bajo `/admin` pero NO lleva el panel alrededor:
 * enseñarle la navegación del estudio a quien todavía no ha entrado es a la
 * vez feo y una filtración de estructura.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/admin/login') {
    return <div className="min-h-dvh">{children}</div>
  }

  return <AdminShell>{children}</AdminShell>
}
