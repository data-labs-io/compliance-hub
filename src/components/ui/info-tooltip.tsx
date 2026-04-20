'use client'

import { Info, HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  content: string | React.ReactNode
  title?: string
  variant?: 'info' | 'help'
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
  iconClassName?: string
}

export function InfoTooltip({
  content,
  title,
  variant = 'info',
  side = 'top',
  className,
  iconClassName
}: InfoTooltipProps) {
  const Icon = variant === 'help' ? HelpCircle : Info

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            className
          )}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
          }}
        >
          <Icon className={cn(
            "h-4 w-4",
            variant === 'info' ? "text-blue-500" : "text-gray-500",
            iconClassName
          )} />
          <span className="sr-only">{title || (variant === 'help' ? 'Help' : 'Information')}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-sm">
        {title && (
          <div className="font-semibold text-sm mb-1">
            {title}
          </div>
        )}
        <div className="text-sm">
          {content}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
