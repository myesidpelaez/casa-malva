import { SideNav } from '@/components/layout/SideNav'
import { BottomNav } from '@/components/layout/BottomNav'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-[#FAF8F9]">
      <SideNav />
      <main className="flex-1 p-4 sm:p-8 pb-20 sm:pb-8 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
