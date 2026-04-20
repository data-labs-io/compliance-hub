'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Shield, BookOpen, Target, AlertCircle, Info, ExternalLink, BarChart2, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { getFrameworkConfig } from '@/config/compliance-frameworks'
import { useColorBlindMode } from '@/hooks/useColorBlindMode'

interface ComplianceFrameworkInfoProps {
  frameworkId: string
}

export function ComplianceFrameworkInfo({ frameworkId }: ComplianceFrameworkInfoProps) {
  const [isOpen, setIsOpen] = useState(false)
  const framework = getFrameworkConfig(frameworkId)
  const { isColorBlindMode } = useColorBlindMode()

  const getColorClasses = (color: string) => {
    // Colorblind mode: use accessible colors
    if (isColorBlindMode) {
      const accessibleColorMap: Record<string, { border: string; bg: string; badge: string }> = {
        green: { border: 'border-accessible-success', bg: 'bg-accessible-success', badge: 'bg-accessible-success' },
        yellow: { border: 'border-accessible-warning', bg: 'bg-accessible-warning', badge: 'bg-accessible-warning' },
        red: { border: 'border-accessible-error', bg: 'bg-accessible-error', badge: 'bg-accessible-error' }
      }
      return accessibleColorMap[color] || accessibleColorMap.green
    }

    const colorMap: Record<string, { border: string; bg: string; badge: string }> = {
      green: { border: 'border-green-500', bg: 'bg-green-600', badge: 'bg-green-600' },
      yellow: { border: 'border-yellow-500', bg: 'bg-yellow-600', badge: 'bg-yellow-600' },
      red: { border: 'border-red-500', bg: 'bg-red-600', badge: 'bg-red-600' }
    }
    return colorMap[color] || colorMap.green
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 dark:bg-blue-700 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <CardTitle className="text-lg">
                  About {framework.name} {framework.version && `${framework.version}`}
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Understanding the framework and how to interpret this dashboard
                </p>
              </div>
            </div>
            <div className={cn(
              "p-1 rounded-full transition-all duration-200",
              isOpen ? "bg-white dark:bg-gray-800 shadow-sm" : "bg-blue-100 dark:bg-blue-900"
            )}>
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Introduction */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">What is {framework.name}?</h3>
                  <div
                    className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: framework.introduction.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                  />
                  {framework.totalSafeguards && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      Each control is further broken down into specific <strong>Safeguards</strong>—actionable steps,
                      totaling <strong>{framework.totalSafeguards} in the latest version</strong>, that organizations
                      can prioritize based on their risk profile and resources.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Distinctions (if applicable) */}
            {framework.distinctions && (
              <>
                <Separator />
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Important Distinction</h3>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{framework.distinctions.title}</p>
                    </div>
                  </div>

                  <div className="ml-8 space-y-3">
                    <div
                      className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: framework.distinctions.description.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                    />

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200 dark:border-amber-800 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{framework.distinctions.thisFramework.title}</p>
                          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                            {framework.distinctions.thisFramework.points.map((point, idx) => (
                              <li key={idx}>• {point}</li>
                            ))}
                          </ul>
                        </div>
                        {framework.distinctions.relatedFramework && (
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{framework.distinctions.relatedFramework.title}</p>
                            <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                              {framework.distinctions.relatedFramework.points.map((point, idx) => (
                                <li key={idx}>• {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Implementation Levels (if applicable) */}
            {framework.implementationLevels && framework.implementationLevels.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                <div className="flex items-start gap-3 mb-4">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Implementation Levels</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      The framework employs tiers that help organizations prioritize implementation
                      based on their size, resources, risk profile, and cybersecurity maturity.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 ml-8">
                  {framework.implementationLevels.map((level) => {
                    const colors = getColorClasses(level.color)
                    return (
                      <div key={level.id} className={cn("border-l-4 pl-4 py-2", colors.border)}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={colors.badge}>{level.shortName}</Badge>
                          <span className="font-medium text-sm dark:text-gray-200">{level.name}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{level.description}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Interpretation Guide */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
              <div className="flex items-start gap-3 mb-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">How to Interpret This Dashboard</h3>
                </div>
              </div>

              <div className="ml-8 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                {/* Scoring */}
                {framework.interpretationGuide.scoring && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <p className="font-medium text-gray-900 dark:text-gray-100">{framework.interpretationGuide.scoring.title}</p>
                    </div>
                    <p className="ml-6">{framework.interpretationGuide.scoring.description}</p>
                  </div>
                )}

                {/* Status Indicators */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <p className="font-medium text-gray-900 dark:text-gray-100">{framework.interpretationGuide.statusIndicators.title}</p>
                  </div>
                  <ul className="space-y-1 ml-6">
                    {framework.interpretationGuide.statusIndicators.items.map((item, idx) => (
                      <li key={idx}>
                        • <span className={cn(
                          "font-medium",
                          item.color === 'green' && (isColorBlindMode ? "text-accessible-success" : "text-green-600"),
                          item.color === 'yellow' && (isColorBlindMode ? "text-accessible-warning" : "text-yellow-600"),
                          item.color === 'red' && (isColorBlindMode ? "text-accessible-error" : "text-red-600")
                        )}>{item.label}</span> - {item.description}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Delta Interpretation */}
                {framework.interpretationGuide.deltaInterpretation.examples.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <p className="font-medium text-gray-900 dark:text-gray-100">{framework.interpretationGuide.deltaInterpretation.title}</p>
                    </div>
                    <p className="mb-2 ml-6">{framework.interpretationGuide.deltaInterpretation.description}</p>
                    <ul className="space-y-1 ml-6">
                      {framework.interpretationGuide.deltaInterpretation.examples.map((example, idx) => (
                        <li key={idx}>
                          • <strong>{example.metric}</strong> - {example.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {framework.notes && framework.notes.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-3 border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-blue-900 dark:text-blue-100 space-y-1">
                  {framework.notes.map((note, idx) => (
                    <p
                      key={idx}
                      dangerouslySetInnerHTML={{ __html: note.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Documentation Link */}
            {framework.documentationUrl && (
              <div>
                <a
                  href={framework.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Official {framework.name} Documentation
                </a>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

// Re-export with original name for backward compatibility
export { ComplianceFrameworkInfo as CISControlsInfo }
