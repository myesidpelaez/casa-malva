'use client'

import * as React from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F9]">
      <TopBar />
      <main className="flex-1 pb-20 sm:pb-8">{children}</main>
      <BottomNav />
    </div>
  )
}
