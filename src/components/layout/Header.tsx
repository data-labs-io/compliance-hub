'use client'

import { Bell, Search, User, LogOut, Settings, HelpCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { getNavigationPath } from '@/lib/navigation'
import { useDashboardStore } from '@/stores/dashboard-store'
import { useSnapshotAwareDashboard } from '@/hooks/useSnapshotAwareDashboard'
import { generateComplianceAlerts } from '@/lib/alerts-calculator'
import { useMemo, useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { SearchResultsDropdown, SearchResult } from './SearchResultsDropdown'
import { SettingsModal } from '@/components/modals/SettingsModal'
import { HelpModal } from '@/components/modals/HelpModal'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'
import { DarkModeToggle } from './DarkModeToggle'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function Header() {
  const router = useRouter()
  const { metrics, setPendingExpandedControl, setPendingSafeguardId } = useDashboardStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(searchTerm, 300)
  const { isColorBlindMode } = useColorBlindMode()

  // Get intent check data for notifications
  const { devices, cisControls, loading, intentCheckDetails } = useSnapshotAwareDashboard()

  // Get failed/warning intent check issues (top 5 for notifications dropdown)
  const intentIssues = useMemo(() => {
    if (!intentCheckDetails || !intentCheckDetails.reports) return []

    return intentCheckDetails.reports
      .filter((report: any) => {
        const checks = report.result?.checks || {}
        const critical = checks['30'] || 0
        const failed = checks['20'] || 0
        const warnings = checks['10'] || 0
        return critical > 0 || failed > 0 || warnings > 0
      })
      .map((report: any) => ({
        id: report.id || report.name,
        name: report.name,
        severity: ((report.result?.checks?.['30'] || 0) + (report.result?.checks?.['20'] || 0)) > 0 ? 'failed' : 'warning',
        criticalCount: report.result?.checks?.['30'] || 0,
        failedCount: report.result?.checks?.['20'] || 0,
        warningCount: report.result?.checks?.['10'] || 0,
        category: report.groups?.[0]?.name || 'Other'
      }))
      .slice(0, 5) // Show top 5
  }, [intentCheckDetails])

  // Filter search results from cached data
  const searchResults = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.trim().length < 2) return []

    const query = debouncedSearch.toLowerCase().trim()
    const results: SearchResult[] = []

    // Search devices (top 3)
    devices.slice(0, 50).forEach((device) => {
      const matchScore =
        (device.hostname?.toLowerCase().includes(query) ? 10 : 0) +
        (device.loginIp?.toLowerCase().includes(query) ? 8 : 0) +
        (device.siteName?.toLowerCase().includes(query) ? 5 : 0) +
        (device.vendor?.toLowerCase().includes(query) ? 3 : 0) +
        (device.model?.toLowerCase().includes(query) ? 2 : 0)

      if (matchScore > 0) {
        results.push({
          id: `device-${device.hostname}`,
          type: 'device',
          title: device.hostname || 'Unknown',
          description: `${device.siteName || 'No site'} • ${device.vendor || 'Unknown'} ${device.model || ''}`,
          status: device.status || 'offline',
          onClick: () => {
            router.push(getNavigationPath(`/dashboard/devices?search=${encodeURIComponent(device.hostname || '')}`))
            setSearchTerm('')
            setShowDropdown(false)
          }
        })
      }
    })

    // Search CIS controls (top 2)
    cisControls.forEach((control) => {
      const title = `Control ${control.id}: ${control.name}`
      if (
        control.id.toLowerCase().includes(query) ||
        control.name.toLowerCase().includes(query) ||
        title.toLowerCase().includes(query)  // Also search the displayed title
      ) {
        results.push({
          id: `control-${control.id}`,
          type: 'control',
          title,
          description: `Score: ${control.score.toFixed(1)}/${control.maxScore}`,
          status: control.status,
          onClick: () => {
            // Set pending control in store for dashboard to expand
            setPendingExpandedControl(control.id)
            // Navigate to dashboard
            router.push(getNavigationPath('/dashboard'))
            setSearchTerm('')
            setShowDropdown(false)
          }
        })
      }
    })

    // Search safeguards/sub-controls within each control
    cisControls.forEach((control) => {
      control.details?.forEach((safeguard) => {
        // Search in safeguard ID, name, and IP Fabric context
        if (
          safeguard.id.toLowerCase().includes(query) ||
          safeguard.name?.toLowerCase().includes(query) ||
          safeguard.ipFabricContext?.toLowerCase().includes(query)
        ) {
          results.push({
            id: `safeguard-${safeguard.id}`,
            type: 'safeguard',
            title: `${safeguard.id} - ${safeguard.name}`,
            description: `Control ${control.id}: ${control.name} • ${safeguard.ipFabricContext || ''}`.substring(0, 100),
            status: control.status,
            onClick: () => {
              // Set pending control in store for dashboard to expand
              setPendingExpandedControl(control.id)
              // Set pending safeguard for precise scrolling
              setPendingSafeguardId(safeguard.id)
              // Navigate to dashboard
              router.push(getNavigationPath('/dashboard'))
              setSearchTerm('')
              setShowDropdown(false)
            }
          })
        }
      })
    })

    // Limit total results
    return results.slice(0, 7) // Top 7 results total
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, devices, cisControls, router]) // setPendingExpandedControl is stable

  const handleSignOut = () => {
    // Simply redirect to login with logout parameter
    window.location.href = getNavigationPath('/login?logout=true')
  }

  const handleSearch = () => {
    if (searchTerm.trim()) {
      router.push(getNavigationPath(`/dashboard/devices?search=${encodeURIComponent(searchTerm.trim())}`))
      setSearchTerm('')
      setShowDropdown(false)
    }
  }

  // Determine if data is still loading
  const isDataLoading = loading && (devices.length === 0 || cisControls.length === 0)

  // Show/hide dropdown based on search term length (always show for 2+ chars to display "no results")
  useEffect(() => {
    const shouldShow = searchTerm.length >= 2
    setShowDropdown(shouldShow)
    setSelectedIndex(0) // Reset selection when results change
  }, [searchResults, searchTerm, isDataLoading])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <svg width="32" height="31" viewBox="0 0 203.6 198.4" className="block dark:brightness-0 dark:invert" xmlns="http://www.w3.org/2000/svg">
            <g id="Group_2">
              <path id="Vector" fill="#8c989b" fillRule="evenodd" d="M152.1,132.5c0,10-9.4,17.8-20.1,15.4-5.9-1.4-10.7-5.9-12.1-11.6-2.5-10.4,5.6-19.7,15.8-19.7,9.1-.2,16.4,7.1,16.4,15.9Z"></path>
              <path id="Vector_2" fill="#264183" fillRule="evenodd" d="M83.7,66.1c0,10-9.4,17.8-20.1,15.4-5.9-1.4-10.7-5.9-12.1-11.6-2.5-10.4,5.6-19.7,15.8-19.7s16.4,7.1,16.4,15.9Z"></path>
            </g>
            <path id="Vector_3" fill="#264183" d="M202.8,16.2v166c0,8.8-7.3,15.9-16.2,15.9h-101.6l33.7-33c5.1,2.6,11,4.1,17.2,4.1,9,0,17.3-3.2,23.8-8.3,1.9-1.5,3.7-3.3,5.3-5.1,6.5-7.7,9.9-17.8,8.2-28.9-2.3-15.6-14.2-27.8-30.2-30.7-9-1.7-17.5-.2-24.7,3.5l-17.3-16.9c2.6-5,4.2-10.6,4.2-16.6s-1.5-12.1-4.3-17.2L150.4.3h36c9.1,0,16.4,7.1,16.4,15.9Z"></path>
            <path id="Vector_4" fill="#8c989b" d="M.8,182.2V16.2C.8,7.4,8.1.3,17,.3h101.6l-33.7,33c-5.1-2.6-11-4.1-17.2-4.1-9,0-17.3,3.2-23.8,8.3-1.9,1.5-3.7,3.3-5.3,5.1-6.5,7.7-9.9,17.8-8.2,28.9,2.3,15.6,14.2,27.8,30.2,30.7,9,1.7,17.5,.2,24.7-3.5l17.3,16.9c-2.6,5-4.2,10.6-4.2,16.6s1.5,12.1,4.3,17.2L53.2,198.1h-36c-9.1,0-16.4-7.1-16.4-15.9Z"></path>
          </svg>
          <span className="text-xl font-semibold ipf-heading whitespace-nowrap dark:text-gray-100">IP Fabric</span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" />
            <Input
              type="search"
              placeholder="Search devices, controls, safeguards, or keywords (zone, AAA, telnet)..."
              className="w-full pl-10 pr-4"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                if (e.target.value.trim().length >= 2) {
                  setShowDropdown(true)
                } else {
                  setShowDropdown(false)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (searchResults.length > 0 && selectedIndex < searchResults.length) {
                    // Execute selected result
                    searchResults[selectedIndex].onClick()
                  } else {
                    // Fallback to devices page search
                    handleSearch()
                  }
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelectedIndex(prev => Math.max(prev - 1, 0))
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  setShowDropdown(false)
                  setSearchTerm('')
                }
              }}
              onFocus={() => {
                if (searchTerm.trim().length >= 2 && searchResults.length > 0) {
                  setShowDropdown(true)
                }
              }}
            />

            {/* Live Search Results Dropdown */}
            <SearchResultsDropdown
              results={searchResults}
              isOpen={showDropdown}
              onClose={() => setShowDropdown(false)}
              selectedIndex={selectedIndex}
              isLoading={isDataLoading}
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {metrics.intentChecksFailed > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {metrics.intentChecksFailed}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Intent Check Issues</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {intentIssues.length > 0 ? (
                <>
                  {intentIssues.map((issue: any) => (
                    <DropdownMenuItem
                      key={issue.id}
                      onClick={() => {
                        router.push(getNavigationPath(`/dashboard/intent-checks?tab=issues&check=${encodeURIComponent(issue.name)}`))
                      }}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2 w-2 rounded-full flex-shrink-0",
                            issue.severity === 'failed' && (isColorBlindMode ? "bg-accessible-error" : "bg-red-500"),
                            issue.severity === 'warning' && (isColorBlindMode ? "bg-accessible-warning" : "bg-orange-500")
                          )} />
                          <p className="text-sm font-medium">{issue.name}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {issue.criticalCount > 0 && `${issue.criticalCount} critical `}
                          {issue.failedCount > 0 && `${issue.failedCount} failed `}
                          {issue.warningCount > 0 && `${issue.warningCount} warnings`}
                          {issue.category && ` • ${issue.category}`}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push(getNavigationPath('/dashboard/intent-checks?tab=issues'))}
                    className="cursor-pointer justify-center"
                  >
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      View All Issues →
                    </div>
                  </DropdownMenuItem>
                </>
              ) : (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No active intent check issues
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Colorblind Mode Indicator */}
          {isColorBlindMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSettingsOpen(true)}
                  className="relative"
                >
                  <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Colorblind Mode Active</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Click to open settings</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Dark Mode Toggle */}
          <DarkModeToggle />

          {/* Help */}
          <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)}>
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatar.png" alt="User" />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Modal */}
          <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

          {/* Help Modal */}
          <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
        </div>
      </div>
    </header>
  )
}