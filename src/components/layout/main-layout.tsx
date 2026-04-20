"use client";

import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

export function MainLayout({ children, sidebar, header, className }: MainLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800", className)}>
      {header && (
        <header className="sticky top-0 z-50 backdrop-blur-md bg-white/10 border-b border-white/20 dark:bg-black/10 dark:border-white/10">
          {header}
        </header>
      )}
      <div className="flex">
        {sidebar && (
          <aside className="w-64 min-h-screen backdrop-blur-md bg-white/5 border-r border-white/20 dark:bg-black/5 dark:border-white/10">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;