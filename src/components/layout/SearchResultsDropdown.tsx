'use client'

import { Server, Shield, Bell, MapPin, ChevronRight, ShieldCheck, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'

export interface SearchResult {
  id: string
  type: 'device' | 'control' | 'alert' | 'site' | 'safeguard'
  title: string
  description: string
  status?: string
  onClick: () => void
}

export interface SearchResultsDropdownProps {
  results: SearchResult[]
  isOpen: boolean
  onClose: () => void
  selectedIndex: number
  isLoading?: boolean
}

export function SearchResultsDropdown({
  results,
  isOpen,
  onClose,
  selectedIndex,
  isLoading = false
}: SearchResultsDropdownProps) {
  const { isColorBlindMode } = useColorBlindMode()

  if (!isOpen) return null

  // Show loading state
  if (isLoading) {
    return (
      <Card className="absolute top-full left-0 right-0 mt-2 shadow-lg border-gray-200 dark:border-blue-800 dark:bg-blue-950 z-50">
        <div className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
            <div className="h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
            <span className="text-sm">Loading data...</span>
          </div>
        </div>
      </Card>
    )
  }

  // Show "no results found" message instead of hiding
  if (results.length === 0) {
    return (
      <Card className="absolute top-full left-0 right-0 mt-2 shadow-lg border-gray-200 dark:border-blue-800 dark:bg-blue-950 z-50">
        <div className="p-6 text-center">
          <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No results found</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Try searching for devices, controls, safeguards, or keywords like &ldquo;AAA&rdquo;, &ldquo;telnet&rdquo;, &ldquo;firewall&rdquo;, &ldquo;zone&rdquo;
          </p>
        </div>
      </Card>
    )
  }

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = []
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  const categoryConfig = {
    device: { icon: Server, label: 'Devices', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    control: { icon: Shield, label: 'Controls', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    safeguard: { icon: ShieldCheck, label: 'Safeguards', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    alert: { icon: Bell, label: 'Alerts', color: 'text-amber-600', bgColor: 'bg-amber-50' },
    site: { icon: MapPin, label: 'Sites', color: 'text-green-600', bgColor: 'bg-green-50' }
  }

  let currentIndex = 0

  return (
    <Card className="absolute top-full left-0 right-0 mt-2 max-h-[500px] overflow-y-auto shadow-lg border-gray-200 dark:border-blue-800 dark:bg-blue-950 z-50">
      <div className="p-2">
        {Object.entries(groupedResults).map(([type, items]) => {
          const config = categoryConfig[type as keyof typeof categoryConfig]
          const Icon = config.icon

          return (
            <div key={type} className="mb-3 last:mb-0">
              {/* Category Header */}
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <Icon className={cn("h-4 w-4", config.color, "dark:opacity-80")} />
                <span>{config.label}</span>
                <span className="text-gray-400 dark:text-gray-500">({items.length})</span>
              </div>

              {/* Category Results */}
              {items.map((result) => {
                const itemIndex = currentIndex++
                const isSelected = itemIndex === selectedIndex

                return (
                  <div
                    key={result.id}
                    onClick={result.onClick}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors",
                      isSelected ? "bg-gray-100 dark:bg-blue-900" : "hover:bg-gray-50 dark:hover:bg-blue-900/50"
                    )}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn("p-1.5 rounded-md flex-shrink-0", config.bgColor, "dark:opacity-80")}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {result.description}
                        </p>
                        {result.status && (
                          <span className={cn(
                            "inline-block mt-1 px-2 py-0.5 text-xs rounded-full",
                            result.status === 'online' && (isColorBlindMode ? "bg-accessible-success/20 text-accessible-success" : "bg-green-100 text-green-700"),
                            result.status === 'offline' && (isColorBlindMode ? "bg-accessible-error/20 text-accessible-error" : "bg-red-100 text-red-700"),
                            result.status === 'warning' && (isColorBlindMode ? "bg-accessible-warning/20 text-accessible-warning" : "bg-amber-100 text-amber-700"),
                            result.status === 'pass' && (isColorBlindMode ? "bg-accessible-success/20 text-accessible-success" : "bg-green-100 text-green-700"),
                            result.status === 'fail' && (isColorBlindMode ? "bg-accessible-warning/20 text-accessible-warning" : "bg-amber-100 text-amber-700")
                          )}>
                            {result.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Show total count if results are limited */}
        {results.length >= 7 && (
          <div className="px-3 py-2 text-xs text-center text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-blue-800 mt-2">
            Showing top {results.length} results. Press Enter to see all on devices page.
          </div>
        )}
      </div>
    </Card>
  )
}
