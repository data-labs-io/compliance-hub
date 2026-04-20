'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { frameworkRegistry } from '@/frameworks/shared'
import { useDashboardStore } from '@/stores/dashboard-store'
import { Shield, FileCheck, Building2, Lock, ShieldCheck, Heart, Award } from 'lucide-react'
import type { FrameworkId } from '@/frameworks/shared/types'

// Framework-specific icons
const FRAMEWORK_ICONS: Record<FrameworkId, React.ElementType> = {
  'cis-v8': Shield,
  'pci-dss': FileCheck,
  'dora': Building2,
  'nist': Lock,
  'nis2': ShieldCheck,
  'hipaa': Heart,
  'iso27001': Award,
}

interface FrameworkSelectorProps {
  disabled?: boolean
  className?: string
}

export function FrameworkSelector({ disabled, className }: FrameworkSelectorProps) {
  const { selectedFramework, setSelectedFramework } = useDashboardStore()
  const frameworks = frameworkRegistry.getAvailable()

  const handleChange = (value: string) => {
    if (value !== selectedFramework) {
      // Framework switch - store handles cache routing
      setSelectedFramework(value as 'cis-v8' | 'pci-dss' | 'nist' | 'nis2')
    }
  }

  const currentFramework = frameworkRegistry.get(selectedFramework)
  const CurrentIcon = FRAMEWORK_ICONS[selectedFramework]

  return (
    <div className={`flex flex-col gap-1 ${className || ''}`}>
      <label className="text-xs font-medium text-blue-700 dark:text-blue-300">
        Framework
      </label>
      <Select
        value={selectedFramework}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[220px] bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white">
          <SelectValue>
            <div className="flex items-center gap-2">
              {CurrentIcon && <CurrentIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
              <span>{currentFramework?.config.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentFramework?.config.version}
              </span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                {currentFramework?.config.maxScore} pts
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
          {frameworks.map(fw => {
            const Icon = FRAMEWORK_ICONS[fw.id]
            const isImplemented = frameworkRegistry.isImplemented(fw.id)
            const isSelected = fw.id === selectedFramework

            return (
              <SelectItem
                key={fw.id}
                value={fw.id}
                disabled={!isImplemented}
                className={`
                  cursor-pointer
                  dark:text-white dark:focus:bg-blue-900/50
                  ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
                  ${!isImplemented ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex items-center gap-2 w-full">
                  {Icon && (
                    <Icon
                      className={`h-4 w-4 ${
                        isImplemented
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    />
                  )}
                  <span className={!isImplemented ? 'text-gray-400 dark:text-gray-500' : ''}>
                    {fw.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {fw.version}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ml-auto ${
                      isImplemented
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {fw.maxScore} pts
                  </span>
                  {!isImplemented && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                      Soon
                    </span>
                  )}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
