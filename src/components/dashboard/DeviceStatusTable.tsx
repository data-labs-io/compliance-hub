'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Device } from '@/lib/device-generator'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardMetrics } from '@/stores/dashboard-store'
import { useIPFabricURL } from '@/hooks/useIPFabricURL'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'

interface DeviceStatusTableProps {
  devices: any[]
  metrics: DashboardMetrics
  currentSnapshot?: any
  loading?: boolean
  initialSearchTerm?: string
  onSearchChange?: (term: string) => void
}

export function DeviceStatusTable({
  devices,
  metrics,
  currentSnapshot,
  loading = false,
  initialSearchTerm = '',
  onSearchChange
}: DeviceStatusTableProps) {
  const { isColorBlindMode } = useColorBlindMode()

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Get IP Fabric URL from session
  const ipFabricUrl = useIPFabricURL()

  // Update search when initialSearchTerm changes
  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm)
      setCurrentPage(1) // Reset to first page to show filtered results
      if (onSearchChange) {
        onSearchChange(initialSearchTerm)
      }
    }
  }, [initialSearchTerm, onSearchChange])

  // Use compliance score from shared metrics
  const overallCompliance = metrics.complianceScore || 0

  // Reset page when devices change
  useEffect(() => {
    setCurrentPage(1)
  }, [devices])

  // Filter devices
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchesSearch =
        device.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.ipAddress.includes(searchTerm) ||
        device.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.model.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' || device.status === statusFilter

      const matchesType =
        typeFilter === 'all' || device.type === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [devices, searchTerm, statusFilter, typeFilter])

  // Pagination
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentDevices = filteredDevices.slice(startIndex, endIndex)

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      online: devices.filter(d => d.status === 'online').length,
      offline: devices.filter(d => d.status === 'offline').length,
      warning: devices.filter(d => d.status === 'warning').length,
      maintenance: devices.filter(d => d.status === 'maintenance').length,
    }
  }, [devices])

  const getStatusIcon = (status: Device['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className={cn("h-4 w-4", isColorBlindMode ? "text-accessible-success" : "text-green-500 dark:text-green-400")} />
      case 'offline':
        return <XCircle className={cn("h-4 w-4", isColorBlindMode ? "text-accessible-error" : "text-red-500 dark:text-red-400")} />
      case 'warning':
        return <AlertCircle className={cn("h-4 w-4", isColorBlindMode ? "text-accessible-warning" : "text-yellow-500 dark:text-yellow-400")} />
      case 'maintenance':
        return <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
    }
  }

  const getStatusBadge = (status: Device['status']) => {
    const statusStyles = {
      online: isColorBlindMode ? 'bg-accessible-success/20 text-accessible-success' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      offline: isColorBlindMode ? 'bg-accessible-error/20 text-accessible-error' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      warning: isColorBlindMode ? 'bg-accessible-warning/20 text-accessible-warning' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      maintenance: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    }

    return (
      <Badge className={cn('capitalize', statusStyles[status])}>
        {status}
      </Badge>
    )
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1 max-w-sm" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Device Status</CardTitle>
            <CardDescription>
              Monitor and manage network devices across all sites
              {currentSnapshot && (
                <span className="text-xs text-gray-500 dark:text-white/60 block mt-1">
                  Snapshot: {currentSnapshot.displayName} • Total: {devices.length} devices • Overall Analysis: {overallCompliance.toFixed(1)}%
                </span>
              )}
            </CardDescription>
          </div>
          {ipFabricUrl && (
            <a
              href={`${ipFabricUrl}/inventory/devices?selectSnapshot=${currentSnapshot?.id || '$last'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400 shadow-sm"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in IP Fabric
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" />
            <Input
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Status: {statusFilter === 'all' ? 'All' : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('online')}>
                Online ({statusCounts.online})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('offline')}>
                Offline ({statusCounts.offline})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('warning')}>
                Warning ({statusCounts.warning})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('maintenance')}>
                Maintenance ({statusCounts.maintenance})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Type: {typeFilter === 'all' ? 'All' : typeFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                All Types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('Switch')}>
                Switch
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('Router')}>
                Router
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('Firewall')}>
                Firewall
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('Wireless')}>
                Wireless
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('Load Balancer')}>
                Load Balancer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select value={String(itemsPerPage)} onValueChange={(value) => {
            setItemsPerPage(Number(value))
            setCurrentPage(1)
          }}>
            <SelectTrigger className="w-[120px] bg-white dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Vendor/Model</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500 dark:text-white/60">
                    No devices found matching the current filters
                  </TableCell>
                </TableRow>
              ) : (
                currentDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>{getStatusIcon(device.status)}</TableCell>
                    <TableCell className="font-medium">
                      {device.hostname}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {device.ipAddress}
                    </TableCell>
                    <TableCell>{device.site}</TableCell>
                    <TableCell>{device.type}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{device.vendor}</div>
                        <div className="text-gray-500 dark:text-white/60">{device.model}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-white/60">
                      {device.version}
                    </TableCell>
                    <TableCell>
                      {device.issues > 0 ? (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="destructive" className="cursor-help">
                                {device.issues}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[300px]">
                              <div className="space-y-1">
                                <p className="font-semibold text-sm">
                                  {device.issues} Issue{device.issues > 1 ? 's' : ''} Detected:
                                </p>
                                {device.issueDetails && device.issueDetails.length > 0 ? (
                                  <ul className="text-xs space-y-0.5">
                                    {device.issueDetails.map((issue: string, idx: number) => (
                                      <li key={idx} className="flex items-start gap-1">
                                        <span className="text-red-400 dark:text-red-300 mt-0.5">•</span>
                                        <span>{issue}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-gray-400 dark:text-white/40">No details available</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-gray-400 dark:text-white/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-white/60">
                      {device.lastSeen}
                    </TableCell>
                    <TableCell>
                      {ipFabricUrl && (() => {
                        // IP Fabric uses JSON filter format in options parameter
                        const filterOptions = JSON.stringify({
                          filters: {
                            and: [
                              { hostname: ["eq", device.hostname] }
                            ]
                          }
                        })
                        return (
                          <a
                            href={`${ipFabricUrl}/inventory/devices?options=${encodeURIComponent(filterOptions)}&selectSnapshot=${currentSnapshot?.id || '$last'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                          >
                            View Device
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )
                      })()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination and Summary */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-white/60">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredDevices.length)} of {filteredDevices.length} devices
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ?
              ` (filtered from ${devices.length} total)` : ''}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={currentPage}
                  onChange={(e) => handlePageChange(Number(e.target.value))}
                  className="w-12 text-center h-9"
                  min={1}
                  max={totalPages}
                />
                <span className="text-sm text-gray-500 dark:text-white/60">/ {totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Status Summary */}
        <div className="mt-4 pt-4 border-t dark:border-gray-700 flex gap-6 text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
            Online: <strong>{statusCounts.online}</strong>
          </span>
          <span className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
            Offline: <strong>{statusCounts.offline}</strong>
          </span>
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
            Warning: <strong>{statusCounts.warning}</strong>
          </span>
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            Maintenance: <strong>{statusCounts.maintenance}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}