'use client'

import { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { SnapshotProvider } from '@/contexts/SnapshotContext'
import { DashboardDataProvider } from '@/contexts/DashboardDataContext'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthErrorBoundary } from '@/components/AuthErrorBoundary'
import { cn } from '@/lib/utils'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar()

  // Apply colorblind mode class at top level
  useColorBlindMode()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className={cn(
          "flex-1 p-6 transition-all duration-300",
          isCollapsed ? "ml-16" : "ml-64"
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthErrorBoundary>
      <SidebarProvider>
        <TooltipProvider delayDuration={200}>
          <SnapshotProvider>
            <DashboardDataProvider>
              <DashboardLayoutContent>
                {children}
              </DashboardLayoutContent>
            </DashboardDataProvider>
          </SnapshotProvider>
        </TooltipProvider>
      </SidebarProvider>
    </AuthErrorBoundary>
  )
}