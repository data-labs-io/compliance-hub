'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, Shield, CheckCircle } from 'lucide-react'

interface HelpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const frameworks = [
  {
    id: 'cis-v8',
    name: 'CIS Controls v8.1',
    description: 'Center for Internet Security - Automated network security controls assessment'
  },
  {
    id: 'pci-dss',
    name: 'PCI-DSS',
    description: 'Payment Card Industry Data Security Standard - Network infrastructure compliance'
  },
  {
    id: 'dora',
    name: 'DORA',
    description: 'Digital Operational Resilience Act - ICT risk management and operational resilience'
  },
  {
    id: 'nist',
    name: 'NIST Cybersecurity Framework',
    description: 'Identify, Protect, Detect, Respond, and Recover controls for cyber threats'
  },
  {
    id: 'nis2',
    name: 'NIS2 Directive',
    description: 'EU Network and Information Security Directive - Essential entity requirements'
  },
  {
    id: 'hipaa',
    name: 'HIPAA Security',
    description: 'Health Insurance Portability and Accountability Act - Technical safeguards'
  },
  {
    id: 'iso27001',
    name: 'ISO 27001:2022',
    description: 'Information security management controls for network infrastructure'
  }
]

const features = [
  'Real-time compliance monitoring from IP Fabric discovery',
  'Multi-framework assessment in a single dashboard',
  'Snapshot comparison and compliance trending',
  'Control-level gap analysis with actionable insights',
  'Automated scoring with drill-down capabilities',
  'Zero-configuration setup with encrypted API storage'
]

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Help & Support
          </DialogTitle>
          <DialogDescription>
            Learn about the IP Fabric Compliance Dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overview Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Dashboard Overview</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              The IP Fabric Compliance Dashboard provides automated security and compliance assessment
              of your network infrastructure. Using IP Fabric&apos;s network discovery data, the dashboard
              evaluates your network against industry-standard frameworks and generates actionable gap
              analysis reports.
            </p>
          </div>

          {/* Supported Frameworks */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Supported Compliance Frameworks</h3>
            <div className="space-y-2">
              {frameworks.map((framework) => (
                <div key={framework.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{framework.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{framework.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Features */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Key Features</h3>
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact CTA
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Need Help?</h3>
            <p className="text-sm text-gray-700">
              Get in touch with IP Fabric experts for enterprise support, custom integrations,
              or additional framework implementations.
            </p>
            <Button asChild className="w-full">
              <a
                href="https://ipfabric.io/company/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                Contact IP Fabric
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div> */}
        </div>
      </DialogContent>
    </Dialog>
  )
}
