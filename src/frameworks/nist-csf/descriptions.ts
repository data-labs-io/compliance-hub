/**
 * NIST CSF v2.0 - Function and Subcategory Descriptions
 * Based on NIST-IMPLEMENTATION-FRAMEWORK.pdf
 *
 * This configuration provides:
 * - Full function descriptions (6 core functions)
 * - Subcategory-level details
 * - IP Fabric context and data sources
 * - Scoring rationales
 * - Target values and interpretation
 */

export interface DataSource {
  name: string
  path: string  // Just the path portion, e.g., '/technology/management/logging/remote-services'
}

export interface SubcategoryDescription {
  id: string                              // e.g., 'GV.RM-1', 'ID.AM-1'
  name: string
  description: string
  ipFabricContext: string
  ipFabricInfo: string
  dataSources?: DataSource[]
  target?: string
  targetInterpretation?: string
  scoringRationale?: string
  maxPoints: number
  reversePolarity?: boolean               // true for metrics where decrease is good
  requiresComparativeSnapshot?: boolean   // true for delta-based checks
  recommendations?: string[]
  remediation?: {
    whenFailing: string[]
    whenWarning?: string[]
    bestPractices?: string[]
  }
}

export interface FunctionDescription {
  functionId: string                      // 'GV', 'ID', 'PR', 'DE', 'RS', 'RC'
  name: string
  description: string
  subcategories: SubcategoryDescription[]
  applicableToNetworkInfrastructure: boolean
}

/**
 * NIST CSF v2.0 - Full Descriptions and Subcategories
 * Based on NIST-IMPLEMENTATION-FRAMEWORK.pdf from IP Fabric
 *
 * Scoring: Each function scores 0-5 points based on weighted subcategory scores
 */
export const NIST_CSF_DESCRIPTIONS: Record<string, FunctionDescription> = {
  'GV': {
    functionId: 'GV',
    name: 'Govern',
    description: 'The organization\'s cybersecurity risk management strategy, expectations, and policy are established, communicated, and monitored. The GOVERN Function provides outcomes to inform what an organization may do to achieve and prioritize the outcomes of the other five Functions.',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      {
        id: 'GV.RM-1',
        name: 'Risk Management Objectives',
        description: 'Risk management objectives are established and agreed to by organizational stakeholders.',
        ipFabricContext: 'Intent Checks (160+)',
        ipFabricInfo: 'These intent checks empower organizations to both understand and manage risk. IP Fabric provides unmatched visibility into the network infrastructure, data, flows, and digital boundaries for the purposes of network assurance and cybersecurity.',
        dataSources: [
          { name: 'Intent Checks', path: '/reports' }
        ],
        target: '≥0',
        targetInterpretation: 'Having active intent checks configured demonstrates risk management capabilities. The count should remain stable or increase.',
        scoringRationale: 'Score 2 points as long as some/any "Intent Checks" return data, but if no "Intent Checks" return data then score is 0.',
        maxPoints: 2
      },
      {
        id: 'GV.OV-03',
        name: 'Risk Management Performance',
        description: 'Organizational cybersecurity risk management performance is evaluated and reviewed for adjustments needed.',
        ipFabricContext: 'Discovery Issues',
        ipFabricInfo: 'Fundamental to risk and asset management is comprehensive and complete discovery. Here we can enumerate and adjust for devices that are unmanaged and/or have problems during discovery by highlighting the most common occurrences that allow us to incorporate and fix them for complete visibility.',
        dataSources: [
          { name: 'Discovery Errors', path: '/tables/reports/discovery-errors' }
        ],
        target: '≤0',
        targetInterpretation: 'Zero discovery issues indicates comprehensive risk visibility. Each unresolved issue represents potential blind spots.',
        scoringRationale: 'Out of a possible 3 points: 0-10 discovery errors penalizes by -1, 11-30 discovery errors penalizes by -2, and 31+ discovery errors penalizes by -3 (total 0).',
        maxPoints: 3,
        reversePolarity: true,
        remediation: {
          whenFailing: [
            'Review discovery error logs in IP Fabric Snapshot Management',
            'Verify SNMP/SSH credentials are correct for all device types',
            'Check network connectivity to devices with discovery issues'
          ],
          bestPractices: [
            'Run discovery snapshots regularly',
            'Maintain up-to-date credential vault',
            'Set up alerts for discovery error thresholds'
          ]
        }
      }
    ]
  },

  'ID': {
    functionId: 'ID',
    name: 'Identify',
    description: 'Understanding the organization\'s assets (e.g., data, hardware, software, systems, facilities, services, people), suppliers, and related cybersecurity risks enables an organization to prioritize its efforts consistent with its risk management strategy.',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      {
        id: 'ID.AM-1',
        name: 'Hardware Asset Inventory',
        description: 'Inventories of hardware managed by the organization are maintained.',
        ipFabricContext: 'Devices',
        ipFabricInfo: 'Automatic discovery and inventory for all network devices and sites, providing a comprehensive view of physical devices within the network infrastructure. For infrastructure there should be no change unless planned.',
        dataSources: [
          { name: 'Devices', path: '/tables/inventory/devices' },
          { name: 'Sites', path: '/tables/inventory/sites' }
        ],
        target: '0',
        targetInterpretation: 'Maintaining comprehensive device and site inventory is essential. Unexpected changes may indicate drift.',
        scoringRationale: 'Device count >0 earns 10 points, Site count >0 earns 10 points. Base 70, divide by 14 for final score contribution.',
        maxPoints: 20  // Raw points before normalization
      },
      {
        id: 'ID.AM-2',
        name: 'Software Asset Inventory',
        description: 'Inventories of software, services, and systems managed by the organization are maintained.',
        ipFabricContext: 'Unique platform or family types',
        ipFabricInfo: 'Provides information about software platforms and OS versions running on network devices.',
        dataSources: [
          { name: 'Platforms', path: '/tables/inventory/summary/platforms' },
          { name: 'OS Version Consistency', path: '/tables/inventory/os-version-consistency/models' }
        ],
        target: 'Delta ≤ 0',
        targetInterpretation: 'Stable or decreasing platform diversity indicates standardization. Version variance of ≤3 is ideal.',
        scoringRationale: 'Platforms >0 earns 10 points. Version variance: 1-3=10, 3-4=7, 5-6=5, 7-8=3, 9-10=1, >10=0.',
        maxPoints: 20
      },
      {
        id: 'ID.AM-3',
        name: 'Network Communication Flows',
        description: 'Representations of the organization\'s authorized network communication and internal and external network data flows are maintained.',
        ipFabricContext: 'Device Based IPv4/IPv6 Addresses & Path Lookups',
        ipFabricInfo: 'Information about every IPv4 address configured on infrastructure devices and whether they are in DNS for both forward and reverse entries. IPv6 addresses (excluding fe80 link-local) are also tracked.',
        dataSources: [
          { name: 'IPv4 Hosts', path: '/tables/addressing/managed-devs' },
          { name: 'IPv6 Hosts', path: '/tables/addressing/ipv6-managed-devs' },
          { name: 'Path Lookup', path: '/graphs/png' }
        ],
        target: '100%',
        targetInterpretation: '100% DNS coverage for IPv4 addresses. IPv6 addresses should be operational. Path lookup demonstrates flow visualization.',
        scoringRationale: 'IPv4 DNS %×10, IPv6 operational %×10 (or 10 if no IPv6), Path lookup capability=10 points.',
        maxPoints: 30
      }
    ]
  },

  'PR': {
    functionId: 'PR',
    name: 'Protect',
    description: 'Safeguards to manage the organization\'s cybersecurity risks are used.',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      {
        id: 'PR.AA-01',
        name: 'Identity and Credential Management',
        description: 'Identities and credentials for authorized users, services, and hardware are managed by the organization.',
        ipFabricContext: 'TACACS/RADIUS servers & LOCAL user accounts',
        ipFabricInfo: 'Shows configured credential management configurations across network devices. Organizations can verify proper authentication mechanisms and identify weak authentication methods. Also satisfies NIST PR.IR-01: Networks and environments are protected from unauthorized logical access and usage.',
        dataSources: [
          { name: 'AAA Servers', path: '/tables/security/aaa/authentication' },
          { name: 'Local Users', path: '/tables/security/aaa/users' }
        ],
        target: '100%',
        targetInterpretation: '100% of devices should have AAA configured. Local user accounts should be minimal and controlled.',
        scoringRationale: 'AAA servers percent×10, Local users percent×10. Base 40, divide by 8 for final score.',
        maxPoints: 20
      },
      {
        id: 'PR.PS-02',
        name: 'Software Maintenance',
        description: 'Software is maintained, replaced, and removed commensurate with risk.',
        ipFabricContext: 'Lifecycle Management (End of *)',
        ipFabricInfo: 'Reports on End of Life milestones and here we are looking for the number of devices that are End of Support.',
        dataSources: [
          { name: 'End of Life Summary', path: '/tables/reports/eof/summary' }
        ],
        target: '0%',
        targetInterpretation: 'Zero devices on End of Support software is ideal. Each EoS device represents unpatched vulnerabilities.',
        scoringRationale: 'Score = (100 - EoS percent) × 10. So 2% EoS = 98% × 10 = 9.8 points.',
        maxPoints: 10,
        reversePolarity: true,
        remediation: {
          whenFailing: [
            'Identify all End of Support devices',
            'Create upgrade project plan with timeline',
            'Prioritize internet-facing devices'
          ],
          bestPractices: [
            'Maintain n, n-1 version strategy',
            'Subscribe to vendor security advisories',
            'Track End of Life dates proactively'
          ]
        }
      },
      {
        id: 'PR.PS-04',
        name: 'Log Record Generation',
        description: 'Log records are generated and made available for continuous monitoring.',
        ipFabricContext: 'Local Logging',
        ipFabricInfo: 'Devices with local system message logging configured (and associated parameters).',
        dataSources: [
          { name: 'Local Logging', path: '/tables/management/logging/local' }
        ],
        target: '100%',
        targetInterpretation: '100% of devices should have local logging configured for audit trails.',
        scoringRationale: 'Local logging percent×10.',
        maxPoints: 10,
        remediation: {
          whenFailing: [
            'Enable local logging on all network devices',
            'Configure appropriate log buffer sizes',
            'Set log severity levels per organizational policy'
          ],
          bestPractices: [
            'Use structured logging where supported',
            'Include timestamps with timezone',
            'Configure log rotation policies'
          ]
        }
      }
    ]
  },

  'DE': {
    functionId: 'DE',
    name: 'Detect',
    description: 'Possible cybersecurity attacks and compromises are found and analyzed.',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      {
        id: 'DE.CM-01',
        name: 'Network Monitoring',
        description: 'Networks and network services are monitored to find potentially adverse events.',
        ipFabricContext: 'Interfaces & IPv4 Route Stability',
        ipFabricInfo: 'The status of all infrastructure and edge ports can be easily and rapidly checked. Here we show the incidents of "errDisable" on ports. Route stability shows the count of most unstable IPv4 routes by recent convergence in the last 15 minutes.',
        dataSources: [
          { name: 'ErrDisabled Interfaces', path: '/tables/inventory/interfaces' },
          { name: 'Route Stability', path: '/tables/networks/route-stability' }
        ],
        target: '0%/0',
        targetInterpretation: '0% errDisabled ports and 0 unstable routes indicates stable network operation.',
        scoringRationale: 'errDisabled: (100-%)×10, Route stability: 10 if 0 unstable routes, else 0.',
        maxPoints: 20,
        reversePolarity: true
      },
      {
        id: 'DE.CM-06',
        name: 'External Service Provider Monitoring',
        description: 'External service provider activities and services are monitored to find potentially adverse events.',
        ipFabricContext: 'eBGP',
        ipFabricInfo: 'IP Fabric collects a huge amount of information across all your IGPs and EGPs but here we are looking for the number of BGP neighbours of type "external".',
        dataSources: [
          { name: 'BGP Neighbors', path: '/tables/routing/protocols/bgp/neighbors' }
        ],
        target: 'Delta ≥ 0',
        targetInterpretation: 'eBGP neighbor count should remain stable or increase. Decreases may indicate connectivity issues.',
        scoringRationale: '10 points if delta ≥ 0, otherwise 0 points.',
        maxPoints: 10,
        requiresComparativeSnapshot: true
      },
      {
        id: 'DE.CM-09',
        name: 'Computing Environment Monitoring',
        description: 'Computing hardware and software, runtime environments, and their data are monitored to find potentially adverse events.',
        ipFabricContext: 'Remote Logging',
        ipFabricInfo: 'Devices with remote system message logging targets (and associated parameters).',
        dataSources: [
          { name: 'Remote Logging', path: '/tables/management/logging/remote' }
        ],
        target: '100%',
        targetInterpretation: '100% of devices should send logs to a centralized SIEM or syslog server.',
        scoringRationale: 'Remote logging percent×10.',
        maxPoints: 10,
        remediation: {
          whenFailing: [
            'Configure syslog servers on all network devices',
            'Ensure network connectivity to logging infrastructure',
            'Verify syslog server capacity for log volume'
          ],
          bestPractices: [
            'Use TLS-encrypted syslog where possible',
            'Configure redundant syslog destinations',
            'Integrate with SIEM for correlation'
          ]
        }
      }
    ]
  },

  'RS': {
    functionId: 'RS',
    name: 'Respond',
    description: 'Actions regarding a detected cybersecurity incident are taken.',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      {
        id: 'RS.MI-01',
        name: 'Incident Containment',
        description: 'Incidents are contained.',
        ipFabricContext: 'ACL policies that permit ANY/ANY',
        ipFabricInfo: 'Detects access control lists and security policies/zones with overly promiscuous rulesets. ANY/ANY rules represent potential incident response blind spots.',
        dataSources: [
          { name: 'Access Lists', path: '/tables/security/acl' },
          { name: 'Global Policies', path: '/tables/security/acl/global-policies' }
        ],
        target: 'Delta ≤ 0',
        targetInterpretation: 'ANY/ANY ACL count should decrease or remain stable. New promiscuous rules indicate security regression.',
        scoringRationale: 'Score = max(0, 50 - ANY/ANY count) / 10. So 20 ANY/ANY rules = 30/10 = 3 points out of 5.',
        maxPoints: 50,  // Base score before normalization
        reversePolarity: true,
        remediation: {
          whenFailing: [
            'Audit all ANY/ANY ACL rules',
            'Replace with specific source/destination pairs',
            'Document business justification for any required broad rules'
          ],
          bestPractices: [
            'Implement least-privilege ACL policies',
            'Use zone-based firewalls where appropriate',
            'Regular ACL audits and cleanup'
          ]
        }
      }
    ]
  },

  'RC': {
    functionId: 'RC',
    name: 'Recover',
    description: 'Assets and operations affected by a cybersecurity incident are restored.',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      {
        id: 'RC.RP-05',
        name: 'Asset Integrity Verification',
        description: 'The integrity of restored assets is verified, systems and services are restored, and normal operating status is confirmed.',
        ipFabricContext: 'Number of IPv4/IPv6 Routes & Saved Config Consistency',
        ipFabricInfo: 'Reachability is paramount for IP networks, so by checking the aggregate route tables we can see if there are missing or new routes between snapshots (i.e. from before and after an incident and/or restore). Config consistency shows devices with deltas between startup and running configs.',
        dataSources: [
          { name: 'IPv4 Routes', path: '/tables/networks/routes' },
          { name: 'IPv6 Routes', path: '/tables/networks/ipv6-routes' },
          { name: 'Saved Config Consistency', path: '/tables/management/configuration/saved' }
        ],
        target: 'Delta ≥ 0',
        targetInterpretation: 'Route counts should remain stable or increase. Config changes count should be 0 (all configs saved).',
        scoringRationale: 'IPv4 routes delta ≥ 0 = 5 points, IPv6 routes delta ≥ 0 = 5 points, Config changed = 0 = 5 points. Base 15, divide by 3 for final score.',
        maxPoints: 15,
        requiresComparativeSnapshot: true,
        remediation: {
          whenFailing: [
            'Investigate missing routes and restore connectivity',
            'Save running configs to startup on all devices',
            'Verify configuration backup procedures'
          ],
          bestPractices: [
            'Maintain configuration backup and restore procedures',
            'Test disaster recovery scenarios regularly',
            'Use IP Fabric snapshots for point-in-time recovery reference'
          ]
        }
      }
    ]
  }
}

/**
 * Get description for a specific NIST CSF function
 */
export function getNISTCSFDescription(functionId: string): FunctionDescription | undefined {
  return NIST_CSF_DESCRIPTIONS[functionId]
}

/**
 * Get all function IDs in order
 */
export function getNISTCSFFunctionIds(): string[] {
  return ['GV', 'ID', 'PR', 'DE', 'RS', 'RC']
}

/**
 * Get human-readable function name
 */
export function getNISTCSFFunctionName(functionId: string): string {
  const names: Record<string, string> = {
    'GV': 'Govern',
    'ID': 'Identify',
    'PR': 'Protect',
    'DE': 'Detect',
    'RS': 'Respond',
    'RC': 'Recover'
  }
  return names[functionId] || functionId
}
