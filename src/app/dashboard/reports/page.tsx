'use client'

import { FileText, Download, Calendar, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ReportsPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Generate and manage analysis reports for your network infrastructure
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Generation Coming Soon
          </CardTitle>
          <CardDescription>
            This feature is currently in development and will be available in the next release
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Reports feature will allow you to:
          </p>

          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <FileText className="h-4 w-4 mt-0.5 text-blue-500" />
              <div>
                <strong>Generate Analysis Reports</strong>
                <p className="text-muted-foreground">
                  Create detailed PDF/JSON reports for CIS Controls, PCI-DSS, DORA, and other frameworks
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <Download className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <strong>Export and Share</strong>
                <p className="text-muted-foreground">
                  Download reports in multiple formats and share with stakeholders
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-0.5 text-purple-500" />
              <div>
                <strong>Schedule Automated Reports</strong>
                <p className="text-muted-foreground">
                  Set up recurring reports to be generated automatically on a schedule
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <TrendingUp className="h-4 w-4 mt-0.5 text-orange-500" />
              <div>
                <strong>Historical Tracking</strong>
                <p className="text-muted-foreground">
                  Access previous reports and track analysis trends over time
                </p>
              </div>
            </li>
          </ul>

          <div className="pt-4">
            <Button disabled className="w-full sm:w-auto">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Workaround</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            While the automated report generation is being developed, you can currently:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li>Export device data from the Devices page</li>
            <li>Take screenshots of analysis metrics from the Dashboard</li>
            <li>Use browser print function (Ctrl+P) to save pages as PDF</li>
            <li>Access detailed reports directly in IP Fabric using the &quot;Open in IP Fabric&quot; buttons</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
