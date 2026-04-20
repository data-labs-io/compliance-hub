'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { CheckCircle } from 'lucide-react'
import { useDashboardStore } from '@/stores/dashboard-store'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { sessionApiUrl } = useDashboardStore()
  const { isColorBlindMode, setColorBlindMode } = useColorBlindMode()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            View your session information and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* IP Fabric Instance URL */}
          <div className="space-y-2">
            <Label htmlFor="api-url">IP Fabric Instance</Label>
            <Input
              id="api-url"
              value={sessionApiUrl || 'Loading...'}
              readOnly
              className="bg-gray-50 dark:bg-gray-900"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The IP Fabric instance you&apos;re connected to
            </p>
          </div>

          {/* API Key Status */}
          <div className="space-y-2">
            <Label>API Key Status</Label>
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/30 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-300">
                Configured & Connected
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              API authentication is active
            </p>
          </div>

          {/* Color Blind Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="colorblind-mode">Color Blind Mode</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Use accessible colors and add icons for better visual clarity
                </p>
              </div>
              <Switch
                id="colorblind-mode"
                checked={isColorBlindMode}
                onCheckedChange={setColorBlindMode}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
