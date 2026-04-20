'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-path'
import { ExtensionLink as Link } from '@/components/ExtensionLink'
import {
  LayoutDashboard,
  Shield,
  GitBranch,
  Map,
  FileText,
  Settings,
  ChevronDown,
  Activity,
  Server,
  AlertCircle,
  BarChart3,
  Camera,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSnapshotContext } from '@/contexts/SnapshotContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { useDashboardStore } from '@/stores/dashboard-store'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'
import { useSnapshotPrefetch } from '@/hooks/usePrefetch'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  children?: NavItem[]
}

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())
  const [timeSinceSync, setTimeSinceSync] = useState<string>('just now')

  // Use sidebar collapse state
  const { isCollapsed, toggleSidebar } = useSidebar()

  // Get metrics for dynamic badge
  const { metrics } = useDashboardStore()
  const { isColorBlindMode } = useColorBlindMode()

  // Navigation items with dynamic alert count
  const navigation: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Intent Checks',
      href: '/dashboard/intent-checks',
      icon: Activity,
      badge: metrics.intentChecksFailed,
    },
    {
      title: 'Devices',
      href: '/dashboard/devices',
      icon: Server,
      badge: metrics.totalDevices,
    },
    // {
    //   title: 'Alerts',
    //   href: '/dashboard/alerts',
    //   icon: AlertCircle,
    //   badge: metrics.activeAlerts,
    // },
    {
      title: 'Reports',
      href: '/dashboard/reports',
      icon: FileText,
    },
  ]

  // Use snapshots context for shared state
  const {
    snapshots,
    filteredSnapshots,
    selectedSnapshot,
    setSelectedSnapshot,
    loading: snapshotsLoading,
    error: snapshotsError,
    refreshSnapshots
  } = useSnapshotContext()

  // Prefetch hook for instant snapshot switching
  const { handleHover, handleHoverEnd } = useSnapshotPrefetch({
    enabled: true,       // Enable hover prefetching
    hoverDelay: 300,     // 300ms before prefetch starts
    priority: 'low'      // Low priority to not interfere with active loads
  })

  // Function to calculate time since last sync
  const calculateTimeSince = (date: Date): string => {
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 10) return 'just now'
    if (seconds < 60) return `${seconds} seconds ago`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`

    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  // Update time since sync display every 10 seconds
  useEffect(() => {
    const updateTimeSince = () => {
      setTimeSinceSync(calculateTimeSince(lastSyncTime))
    }

    // Update immediately
    updateTimeSince()

    // Then update every 10 seconds
    const interval = setInterval(updateTimeSince, 10000)

    return () => clearInterval(interval)
  }, [lastSyncTime])

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    )
  }

  const formatSnapshotDate = (dateString: string) => {
    try {
      const date = new Date(dateString)

      // Check if date is valid
      if (isNaN(date.getTime())) {
        // If it's not a valid date, try to parse IP Fabric format
        // IP Fabric might return timestamps in format "YYYY-MM-DD, HH:MM:SS Z"
        const match = dateString.match(/(\d{4}-\d{2}-\d{2})[, ]+(\d{2}:\d{2}:\d{2})\s*Z?/)
        if (match) {
          const newDate = new Date(`${match[1]}T${match[2]}Z`)
          if (!isNaN(newDate.getTime())) {
            return newDate.toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
              timeZoneName: 'short'
            })
          }
        }
        return dateString
      }

      // Format the date to match IP Fabric's display
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
      })
    } catch {
      return dateString
    }
  }

  const NavLink = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const Icon = item.icon
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.title)
    // Special handling for Dashboard - exact match only to avoid highlighting when on child routes
    const isActive = item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === item.href || pathname.startsWith(item.href + '/')

    // Collapsed view - show only icon with tooltip
    if (isCollapsed && depth === 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className={cn(
                  'relative flex items-center justify-center rounded-lg p-3 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                  isActive && 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={cn(
                    "absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center text-[10px] font-medium",
                    item.title === 'Devices'
                      ? "text-green-600 dark:text-green-400 font-bold"
                      : (isColorBlindMode ? "rounded-full bg-accessible-warning text-white" : "rounded-full bg-orange-500 dark:bg-orange-400 text-white")
                  )}>
                    {isColorBlindMode && item.title !== 'Devices' && (
                      <AlertCircle className="h-2 w-2 mr-0.5" />
                    )}
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.title}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
              isActive && 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40',
              depth > 0 && 'ml-6'
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              {!isCollapsed && <span>{item.title}</span>}
            </div>
            {!isCollapsed && (
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            )}
          </button>
          {isExpanded && item.children && !isCollapsed && (
            <div className="mt-1">
              {item.children.map((child) => (
                <NavLink key={child.href} item={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
          isActive && 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40',
          depth > 0 && 'ml-6',
          isCollapsed && 'justify-center'
        )}
      >
        <div className={cn('flex items-center gap-3', isCollapsed && 'gap-0')}>
          <Icon className="h-4 w-4" />
          {!isCollapsed && <span>{item.title}</span>}
        </div>
        {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
          <span className={cn(
            "flex items-center justify-center text-xs font-medium",
            item.title === 'Devices'
              ? "text-green-600 dark:text-green-400 font-bold h-5 w-5"
              : (isColorBlindMode
                ? "rounded-full bg-accessible-warning/20 text-accessible-warning px-1.5 py-0.5 gap-0.5"
                : "rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 gap-0.5")
          )}>
            {isColorBlindMode && item.title !== 'Devices' && (
              <AlertCircle className="h-3 w-3" />
            )}
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside className={cn(
      "fixed left-0 top-16 h-[calc(100vh-4rem)] border-r bg-white dark:bg-gray-900 dark:border-gray-800 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Tab Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-[16.5px] top-8 z-50 transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <svg
            width="18"
            height="27"
            viewBox="0 0 12 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9 1H0V17H9C10.1046 17 11 16.1046 11 15V3C11 1.89543 10.1046 1 9 1Z" className="fill-white dark:fill-gray-900" />
            <path d="M0 1H8C9.65685 1 11 2.34315 11 4V14C11 15.6569 9.65685 17 8 17H0" className="stroke-gray-200 dark:stroke-gray-800" />
            <path d="M3 6L6.29289 8.29289C6.68342 8.68342 6.68342 9.31658 6.29289 9.70711L3 12" className="stroke-gray-700 dark:stroke-gray-300" strokeLinecap="round" />
          </svg>
        ) : (
          <svg
            width="18"
            height="27"
            viewBox="0 0 12 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9 1H0V17H9C10.1046 17 11 16.1046 11 15V3C11 1.89543 10.1046 1 9 1Z" className="fill-white dark:fill-gray-900" />
            <path d="M0 1H8C9.65685 1 11 2.34315 11 4V14C11 15.6569 9.65685 17 8 17H0" className="stroke-gray-200 dark:stroke-gray-800" />
            <path d="M6 6L3.70711 8.29289C3.31658 8.68342 3.31658 9.31658 3.70711 9.70711L6 12" className="stroke-gray-700 dark:stroke-gray-300" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <div className={cn("flex h-full flex-col gap-2", isCollapsed ? "p-2" : "p-4")}>

        {/* Real-time Status */}
        {isCollapsed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "mb-2 rounded-lg p-2 flex justify-center",
                  isColorBlindMode ? "bg-accessible-success/10 dark:bg-accessible-success/20" : "bg-green-50 dark:bg-green-900/30"
                )}>
                  <div className="relative">
                    <div className={cn("h-3 w-3 rounded-full", isColorBlindMode ? "bg-accessible-success" : "bg-green-500 dark:bg-green-400")} />
                    <div className={cn("absolute inset-0 h-3 w-3 animate-ping rounded-full opacity-75", isColorBlindMode ? "bg-accessible-success" : "bg-green-500 dark:bg-green-400")} />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Connected to IP Fabric</p>
                <p className="text-xs">Last sync: {timeSinceSync}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className={cn(
            "mb-4 rounded-lg p-3",
            isColorBlindMode ? "bg-accessible-success/10 dark:bg-accessible-success/20" : "bg-green-50 dark:bg-green-900/30"
          )}>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className={cn("h-2 w-2 rounded-full", isColorBlindMode ? "bg-accessible-success" : "bg-green-500 dark:bg-green-400")} />
                <div className={cn("absolute inset-0 h-2 w-2 animate-ping rounded-full opacity-75", isColorBlindMode ? "bg-accessible-success" : "bg-green-500 dark:bg-green-400")} />
              </div>
              <span className={cn("text-sm font-medium", isColorBlindMode ? "text-accessible-success" : "text-green-700 dark:text-green-400")}>Connected to IP Fabric</span>
            </div>
            <p className={cn("mt-1 text-xs", isColorBlindMode ? "text-accessible-success" : "text-green-600 dark:text-green-500")}>Last sync: {timeSinceSync}</p>
          </div>
        )}

        {/* Snapshot Selection */}
        {isCollapsed ? (
          <div className="mb-2 flex flex-col items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    disabled
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">Active Snapshot</p>
                  <p className="text-xs">
                    {(() => {
                      const currentSnapshot = snapshots.find(s => s.id === selectedSnapshot)
                      if (!currentSnapshot) return 'No snapshot'
                      return currentSnapshot.name === currentSnapshot.id ?
                        (currentSnapshot.id === '$last' ? 'Latest Snapshot' : currentSnapshot.id) :
                        currentSnapshot.name
                    })()}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={async () => {
                      await refreshSnapshots()
                      setLastSyncTime(new Date())
                    }}
                    disabled={snapshotsLoading}
                  >
                    {snapshotsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Refresh snapshots</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">
                <Camera className="mr-1 inline h-3 w-3" />
                Active Snapshot
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={async () => {
                  // Refresh snapshots without changing selection
                  await refreshSnapshots()
                  // Update last sync time
                  setLastSyncTime(new Date())
                }}
                disabled={snapshotsLoading}
              >
                {snapshotsLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>

            {snapshotsError ? (
              <div className={cn(
                "rounded p-2 text-xs",
                isColorBlindMode ? "bg-accessible-error/10 text-accessible-error" : "bg-red-50 text-red-600"
              )}>
                Failed to load snapshots: {snapshotsError}
              </div>
            ) : (
              <Select value={selectedSnapshot} onValueChange={setSelectedSnapshot} disabled={snapshotsLoading}>
                <SelectTrigger className="w-full h-auto min-h-[2.25rem] py-2">
                  <SelectValue placeholder={snapshotsLoading ? "Loading..." : "Select snapshot"}>
                    {(() => {
                      const currentSnapshot = snapshots.find(s => s.id === selectedSnapshot)
                      if (!currentSnapshot) return null

                      return (
                        <div className="flex items-center gap-2 text-left">
                          {/* Status indicator */}
                          <div className="flex-shrink-0">
                            {currentSnapshot.state === 'loaded' ? (
                              <div className={cn("h-2 w-2 rounded-full", isColorBlindMode ? "bg-accessible-success" : "bg-green-500 dark:bg-green-400")} />
                            ) : (
                              <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">
                              {currentSnapshot.displayName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {formatSnapshotDate(currentSnapshot.createdAt)}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[calc(16rem-2rem)] max-w-[20rem]">
                  {filteredSnapshots.map((snapshot) => (
                    <SelectItem
                      key={snapshot.id}
                      value={snapshot.id}
                      className="p-0"
                      onMouseEnter={() => handleHover(snapshot.id)}
                      onMouseLeave={handleHoverEnd}
                    >
                      <div className="flex w-full items-start gap-2 p-2">
                        {/* Status indicator */}
                        <div className="mt-1.5 flex-shrink-0">
                          {snapshot.state === 'loaded' ? (
                            <div className="relative">
                              <div className={cn("h-2 w-2 rounded-full", isColorBlindMode ? "bg-accessible-success" : "bg-green-500 dark:bg-green-400")} />
                              <div className={cn("absolute inset-0 h-2 w-2 animate-pulse rounded-full opacity-75", isColorBlindMode ? "bg-accessible-success" : "bg-green-500 dark:bg-green-400")} />
                            </div>
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          {/* Snapshot name */}
                          <div className="font-medium text-sm leading-5 text-gray-900 dark:text-gray-100 truncate">
                            {snapshot.displayName}
                          </div>

                          {/* Creation date */}
                          <div className="text-xs text-gray-500 dark:text-gray-400 leading-4 mt-0.5">
                            {formatSnapshotDate(snapshot.createdAt)}
                          </div>

                          {/* Note (if exists and not default) */}
                          {snapshot.note && snapshot.note !== 'Untitled' && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 leading-4 mt-1 truncate" title={snapshot.note}>
                              {snapshot.note}
                            </div>
                          )}

                          {/* Version info (if available) */}
                          {snapshot.version && (
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 leading-3 mt-1">
                              v{snapshot.version}
                            </div>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Version Info */}
        {!isCollapsed && (
          <div className="border-t dark:border-gray-800 pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Compliance Hub v1.1 © 2026
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              Developed by Vincent Sampieri and Daniel Rieger
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}