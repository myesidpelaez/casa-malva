'use client'

import * as React from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { SiteFooter } from './SiteFooter'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main id="contenido" className="flex-1 pb-28 md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  )
}
