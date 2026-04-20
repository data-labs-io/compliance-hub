/**
 * PCI DSS v4.0.1 Requirement and Sub-Requirement Descriptions
 * Extracted from PCI-DSS-gap-analysis-mockup-v3.pdf
 *
 * This configuration provides:
 * - Full requirement descriptions
 * - Sub-requirement level details
 * - IP Fabric context and data sources
 * - Scoring rationales
 * - Target values and delta logic
 * - RAG (Red/Amber/Green) color coding
 */

export interface DataSource {
  name: string
  path: string  // Just the path portion, e.g., '/technology/management/logging/remote-services'
}

export interface PCIDSSSubRequirement {
  id: string
  name: string
  description: string
  ipFabricContext: string
  ipFabricInfo: string
  apiEndpoint?: string    // @deprecated - use dataSources instead
  guiPath?: string        // @deprecated - use dataSources instead
  dataSources?: DataSource[]  // Array of data sources with name and path
  target?: string
  targetInterpretation?: string
  scoringRationale?: string
  maxPoints: number
  reversePolarity?: boolean       // true for metrics where decrease is good (errors, telnet, etc.)
  deltaScoring?: boolean          // true if delta affects the score
  recommendations?: string[]
  remediation?: {
    whenFailing: string[]
    whenWarning?: string[]
    bestPractices?: string[]
  }
}

export interface PCIDSSRequirementDescription {
  requirementId: string
  name: string
  description: string
  subRequirements: PCIDSSSubRequirement[]
  applicableToNetworkInfrastructure: boolean
}

/**
 * PCI DSS v4.0.1 - Requirement Descriptions
 * Based on PCI-DSS-gap-analysis-mockup-v3.pdf
 *
 * Focuses on 6 of 12 requirements where IP Fabric provides network visibility:
 * - Requirement 1: Network Security Controls (55 points)
 * - Requirement 2: Secure Configurations (35 points)
 * - Requirement 6: Secure Systems (5 points)
 * - Requirement 7: Access Restrictions (5 points)
 * - Requirement 8: User Authentication (15 points)
 * - Requirement 10: Logging & Monitoring (15 points)
 * - Requirement 11: Security Testing (5 points)
 * - Requirement 12: Policy Support (20 points)
 *
 * Total: 155 points maximum
 */
export const PCI_DSS_REQUIREMENTS: Record<string, PCIDSSRequirementDescription> = {
  '1': {
    requirementId: '1',
    name: 'Install and Maintain Network Security Controls',
    description: 'Network security controls (NSCs) are critical for protecting the cardholder data environment. Requirement 1 mandates the installation and maintenance of network security controls such as firewalls, routers with ACLs, and other network policy enforcement points that restrict traffic between untrusted networks and the CDE (Cardholder Data Environment).',
    applicableToNetworkInfrastructure: true,
    subRequirements: [
      {
        id: '1.2.1',
        name: 'Configuration standards for NSC rulesets are defined, implemented, maintained',
        description: 'Enumerate all ACL and Zone Firewall policies to demonstrate configuration standards exist',
        ipFabricContext: 'ACL and Zone Firewall policy enumeration',
        ipFabricInfo: 'Enumerates access control list rulesets and zone-based firewall policies. More policies indicate enforcement and granularity.',
        dataSources: [
          { name: 'ACL Policies', path: '/technology/security/acl/global-acl-policies' },
          { name: 'Zone Firewall', path: '/technology/security/zone-firewall' }
        ],
        target: 'Delta ≥ 0',
        targetInterpretation: 'Policy count should stay constant or grow as security increases',
        scoringRationale: 'ACL policies (5pts if Delta ≥ 0) + Zone FW policies (5pts if Delta ≥ 0). If either A or B = 0, score = 0.',
        maxPoints: 10,
        deltaScoring: true,
        recommendations: [
          'Review and document all ACL rulesets',
          'Maintain zone firewall policy inventory',
          'Increase policy granularity for better security'
        ]
      },
      {
        id: '1.2.2',
        name: 'All changes to network connections and NSC configurations are approved and managed',
        description: 'Configuration files are tracked and can be compared between snapshots to identify unauthorized changes',
        ipFabricContext: 'Device Configuration Management',
        ipFabricInfo: 'Configuration files tracked and compared between snapshots. Number of managed configurations indicates coverage.',
        apiEndpoint: '/tables/management/configuration',
        guiPath: 'Management/Configuration',
        target: 'Delta ≥ 0',
        targetInterpretation: 'Configuration count should stay constant or grow',
        scoringRationale: 'Full 5 points if Delta ≥ 0. If either A or B = 0, score = 0.',
        maxPoints: 5,
        deltaScoring: true
      },
      {
        id: '1.2.3',
        name: 'Accurate network diagram is maintained showing CDE connections',
        description: 'Full topology, site-based, L3, or L2 diagrams are available',
        ipFabricContext: 'Automatic Diagramming',
        ipFabricInfo: 'IP Fabric can generate dynamic network diagrams from snapshot data',
        apiEndpoint: '/graphs/png, /diagrams/topology-tree',
        guiPath: 'Diagrams/Topology Tree',
        target: 'N/A',
        targetInterpretation: 'Binary check - can generate diagrams or not',
        scoringRationale: 'Full 5 points if both snapshots can generate diagrams, else 0',
        maxPoints: 5,
        deltaScoring: false
      },
      {
        id: '1.2.5',
        name: 'All services, protocols, and ports allowed are identified and approved',
        description: 'Detect overly promiscuous ANY/ANY rulesets in ACLs and firewalls',
        ipFabricContext: 'ANY/ANY ACL and Firewall policies',
        ipFabricInfo: 'Detects access control lists and security policies with overly permissive rulesets (ANY/ANY patterns including 0.0.0.0, any, ::/0)',
        dataSources: [
          { name: 'ACL Policies', path: '/technology/security/acl/global-acl-policies' },
          { name: 'Zone Firewall', path: '/technology/security/zone-firewall' }
        ],
        target: 'Delta ≤ 0',
        targetInterpretation: 'ANY/ANY rules should decrease - very few valid use cases',
        scoringRationale: 'ACL ANY/ANY (5pts if Delta ≤ 0) + FW ANY/ANY (5pts if Delta ≤ 0)',
        maxPoints: 10,
        reversePolarity: true,
        deltaScoring: true,
        recommendations: [
          'Review and eliminate ANY/ANY rules',
          'Replace with specific source/destination rules',
          'Document valid use cases for remaining ANY/ANY rules'
        ],
        remediation: {
          whenFailing: [
            'ANY/ANY rules increased - immediately review new rules',
            'Identify business justification for each ANY/ANY rule',
            'Replace with specific IP ranges where possible'
          ],
          bestPractices: [
            'Maintain zero ANY/ANY rules in production',
            'Use specific IP addresses and port ranges',
            'Implement least-privilege network policies'
          ]
        }
      },
      {
        id: '1.2.6',
        name: 'Security features implemented for insecure protocols to mitigate risk',
        description: 'Enumerate managed devices where clear text telnet protocol is enabled',
        ipFabricContext: 'Clear text telnet protocol enabled',
        ipFabricInfo: 'Enumerates devices with telnet enabled - insecure protocol transmitting credentials in clear text',
        apiEndpoint: '/tables/security/enabled-telnet',
        guiPath: 'Technology/Management/Telnet access',
        target: '0%',
        targetInterpretation: 'Zero devices should have telnet enabled',
        scoringRationale: '((100 - percentage) / 100) × 5. Example: 3% telnet = 97% of 5 = 4.85',
        maxPoints: 5,
        reversePolarity: true,
        recommendations: [
          'Disable telnet on all network devices',
          'Use SSH for all administrative access',
          'Implement strong cryptography for management protocols'
        ],
        remediation: {
          whenFailing: [
            'Disable telnet globally across all devices',
            'Enable SSH with strong cryptography',
            'Update administrative procedures to prohibit telnet'
          ]
        }
      },
      {
        id: '1.2.7',
        name: 'NSC configurations reviewed every six months',
        description: 'Configuration files tracked to demonstrate review capability',
        ipFabricContext: 'Device Configuration Management',
        ipFabricInfo: 'Configuration tracking capability - can supply latest configurations for review',
        apiEndpoint: '/tables/management/configuration',
        guiPath: 'Management/Configuration',
        target: 'Delta ≥ 0',
        targetInterpretation: 'Configuration management coverage should be maintained',
        scoringRationale: 'Full 5 points if Delta ≥ 0. If either A or B = 0, score = 0.',
        maxPoints: 5,
        deltaScoring: true
      },
      {
        id: '1.3.1-1.3.2',
        name: 'Inbound/outbound traffic to CDE restricted - only necessary traffic allowed',
        description: 'Enumerate ACL and Zone Firewall policies demonstrating traffic restrictions',
        ipFabricContext: 'ACL and Zone Firewall policies',
        ipFabricInfo: 'Policy count indicates traffic restriction enforcement and granularity',
        dataSources: [
          { name: 'ACL Policies', path: '/technology/security/acl/global-acl-policies' },
          { name: 'Zone Firewall', path: '/technology/security/zone-firewall' }
        ],
        target: 'Delta ≥ 0',
        targetInterpretation: 'Combined ACL + Firewall policy coverage',
        scoringRationale: 'Combined 5 points if both Delta ≥ 0. If either A or B = 0, score = 0.',
        maxPoints: 5,
        deltaScoring: true
      },
      {
        id: '1.4.1-1.4.2',
        name: 'NSCs implemented between trusted/untrusted networks with inbound restrictions',
        description: 'Enumerate ACL and Zone Firewall policies demonstrating network segmentation',
        ipFabricContext: 'ACL and Zone Firewall policies',
        ipFabricInfo: 'Same metrics as 1.3.1-1.3.2, validates trust boundary enforcement',
        dataSources: [
          { name: 'ACL Policies', path: '/technology/security/acl/global-acl-policies' },
          { name: 'Zone Firewall', path: '/technology/security/zone-firewall' }
        ],
        target: 'Delta ≥ 0',
        targetInterpretation: 'Policy enforcement at trust boundaries',
        scoringRationale: 'Combined 5 points if both Delta ≥ 0. If either A or B = 0, score = 0.',
        maxPoints: 5,
        deltaScoring: true
      },
      {
        id: '1.4.5',
        name: 'Disclosure of internal IP addresses limited to authorized parties',
        description: 'Enumerate external BGP neighbors that could expose internal routing information',
        ipFabricContext: 'eBGP Neighbours',
        ipFabricInfo: 'Counts established BGP sessions with external autonomous systems (AS < 64512)',
        dataSources: [
          { name: 'BGP Neighbors', path: '/technology/routing/bgp/neighbors' }
        ],
        target: 'Delta ≤ 0',
        targetInterpretation: 'External BGP peering should be controlled and minimized',
        scoringRationale: 'Full 5 points if Delta ≤ 0, else 0. Increasing external BGP peers = potential info disclosure risk.',
        maxPoints: 5,
        reversePolarity: true,
        deltaScoring: true,
        recommendations: [
          'Review all external BGP peering relationships',
          'Limit route advertisements to external peers',
          'Implement route filtering and prefix lists'
        ]
      }
    ]
  },
  '2': {
    requirementId: '2',
    name: 'Apply Secure Configurations to All System Components',
    description: 'Malicious individuals often exploit default passwords and other vendor default settings to compromise systems. Requirement 2 mandates that all system components are configured securely with vendor defaults changed, unnecessary services disabled, and only essential functionality enabled.',
    applicableToNetworkInfrastructure: true,
    subRequirements: [
      {
        id: '2.2.1',
        name: 'Configuration standards are developed, implemented, and maintained',
        description: 'Track End of Support devices and discovery issues to validate configuration management',
        ipFabricContext: 'End of Support + Discovery Issues',
        ipFabricInfo: 'Reports devices at End of Support and discovery problems that prevent proper configuration management',
        dataSources: [
          { name: 'End of Life Milestones', path: '/inventory/end-of-life-milestones/summary' },
          { name: 'Discovery Errors', path: '/reports/discovery-errors' }
        ],
        target: '0%',
        targetInterpretation: 'Zero EoS devices and minimal discovery issues',
        scoringRationale: 'EoS: ((100 - percentage) / 100) × 5. Discovery: 5pts - penalty (0-10 errors = -1, ≥11 errors = -2)',
        maxPoints: 10,
        reversePolarity: true,
        recommendations: [
          'Replace End of Support devices',
          'Resolve discovery errors for complete visibility',
          'Maintain current device lifecycle management'
        ],
        remediation: {
          whenFailing: [
            'Identify and budget for EoS device replacements',
            'Review discovery errors and fix authentication/connectivity issues',
            'Establish device lifecycle tracking process'
          ]
        }
      },
      {
        id: '2.2.2',
        name: 'Vendor default accounts are managed',
        description: 'Track local AAA user accounts to ensure default accounts are changed',
        ipFabricContext: 'LOCAL user authentication accounts',
        ipFabricInfo: 'Shows AAA local user accounts configured on network devices. Only subset of devices support local accounts but critical for disaster recovery.',
        dataSources: [
          { name: 'AAA Local Users', path: '/technology/management/aaa/local-users' }
        ],
        target: 'N/A',
        targetInterpretation: 'Percentage indicates coverage - not target-based',
        scoringRationale: '(percentage / 100) × 5. Example: 52% = 2.6 points',
        maxPoints: 5,
        recommendations: [
          'Ensure backup local accounts exist on all supported devices',
          'Change all default passwords',
          'Document local account usage policy'
        ]
      },
      {
        id: '2.2.4',
        name: 'Only necessary services, protocols, and functions enabled',
        description: 'Enumerate devices with insecure telnet protocol enabled',
        ipFabricContext: 'Clear text telnet protocol left enabled',
        ipFabricInfo: 'Tracks telnet usage - unnecessary insecure protocol',
        apiEndpoint: '/tables/security/enabled-telnet',
        guiPath: 'Technology/Management/Telnet access',
        target: '0%',
        targetInterpretation: 'Zero devices should have telnet enabled',
        scoringRationale: '((100 - percentage) / 100) × 5. Example: 3% = 97% of 5 = 4.85',
        maxPoints: 5,
        reversePolarity: true,
        recommendations: [
          'Disable all unnecessary services',
          'Remove telnet completely',
          'Enable only SSH for management'
        ]
      },
      {
        id: '2.2.6',
        name: 'System security parameters configured to prevent misuse',
        description: 'Track TACACS/RADIUS servers and NTP synchronization',
        ipFabricContext: 'AAA Authentication + NTP Synchronization',
        ipFabricInfo: 'Shows configured credential management (TACACS+/RADIUS) and time synchronization (NTP)',
        dataSources: [
          { name: 'AAA Authentication', path: '/technology/management/aaa/authentication' },
          { name: 'NTP Summary', path: '/technology/management/ntp/summary' }
        ],
        target: 'AAA: Delta ≥ 0, NTP: 100%',
        targetInterpretation: 'AAA deployment should grow, NTP should be universal',
        scoringRationale: 'AAA: (percentage / 100) × 5. NTP: (percentage / 100) × 5. Example: AAA 40% = 2pts, NTP 65% = 3.25pts',
        maxPoints: 10,
        recommendations: [
          'Deploy centralized AAA on all supported devices',
          'Configure NTP on all devices',
          'Verify NTP synchronization (not just configuration)'
        ]
      },
      {
        id: '2.2.7',
        name: 'Non-console administrative access encrypted using strong cryptography',
        description: 'Enumerate devices with clear text telnet enabled',
        ipFabricContext: 'Clear text telnet protocol left enabled',
        ipFabricInfo: 'Telnet transmits credentials in clear text - must be eliminated',
        apiEndpoint: '/tables/security/enabled-telnet',
        guiPath: 'Technology/Management/Telnet access',
        target: '0%',
        targetInterpretation: 'Zero devices with telnet enabled',
        scoringRationale: '((100 - percentage) / 100) × 5. Example: 3% = 97% of 5 = 4.85',
        maxPoints: 5,
        reversePolarity: true,
        remediation: {
          whenFailing: [
            'Disable telnet globally',
            'Enable SSH with minimum version 2.0',
            'Configure strong ciphers and key exchange algorithms'
          ]
        }
      }
    ]
  },
  '6': {
    requirementId: '6',
    name: 'Develop and Maintain Secure Systems and Software',
    description: 'Actors with bad intentions can use security vulnerabilities to gain privileged access to systems. Many of these vulnerabilities are fixed by vendor provided security patches, which must be installed by the entities that manage the systems.',
    applicableToNetworkInfrastructure: true,
    subRequirements: [
      {
        id: '6.3.3',
        name: 'System components protected from known vulnerabilities with security patches',
        description: 'Track End of Support devices that cannot receive security patches',
        ipFabricContext: 'Lifecycle Management (End of *)',
        ipFabricInfo: 'Reports devices at End of Support milestone - cannot receive security updates',
        apiEndpoint: '/tables/reports/eof/summary',
        guiPath: 'Inventory/End of Life Milestones',
        target: '0%',
        targetInterpretation: 'Zero End of Support devices',
        scoringRationale: '((100 - percentage) / 100) × 5. Example: 2% = 98% of 5 = 4.9',
        maxPoints: 5,
        reversePolarity: true,
        recommendations: [
          'Replace End of Support devices',
          'Maintain current device lifecycle',
          'Plan upgrades before End of Support dates'
        ]
      }
    ]
  },
  '7': {
    requirementId: '7',
    name: 'Restrict Access to System Components and Cardholder Data',
    description: 'Unauthorized individuals may gain access to critical data or systems due to ineffective access control rules and definitions. To ensure critical data can only be accessed by authorized personnel, systems and processes must be in place to limit access based on need to know and according to job responsibilities.',
    applicableToNetworkInfrastructure: true,
    subRequirements: [
      {
        id: '7.2.1-7.2.2-7.2.5-7.3.1',
        name: 'Access control model with least privileges',
        description: 'Track centralized AAA (TACACS+/RADIUS) for access control',
        ipFabricContext: 'TACACS and RADIUS servers configured',
        ipFabricInfo: 'Shows centralized credential management. Only subset of devices support AAA but critical for access control.',
        dataSources: [
          { name: 'AAA Authentication', path: '/technology/management/aaa/authentication' }
        ],
        target: 'Delta ≥ 0',
        targetInterpretation: 'AAA deployment should maintain or grow',
        scoringRationale: '(percentage / 100) × 5. Example: 40% = 2 points',
        maxPoints: 5,
        recommendations: [
          'Deploy centralized AAA on all supported devices',
          'Implement role-based access control (RBAC)',
          'Document least-privilege access policies'
        ]
      }
    ]
  },
  '8': {
    requirementId: '8',
    name: 'Identify Users and Authenticate Access to System Components',
    description: 'Identification of an individual or process on a computer system is conducted by associating an identity with a person or process through an identifier, such as a user, system, or application ID. These IDs fundamentally establish identity and enable proper authentication.',
    applicableToNetworkInfrastructure: true,
    subRequirements: [
      {
        id: '8.2.2',
        name: 'Group, shared, or generic IDs used only when necessary on exception basis',
        description: 'Track local AAA users and centralized AAA for authentication management',
        ipFabricContext: 'LOCAL user accounts + TACACS/RADIUS servers',
        ipFabricInfo: 'Shows local backup accounts and centralized authentication deployment',
        dataSources: [
          { name: 'AAA Local Users', path: '/technology/management/aaa/local-users' },
          { name: 'AAA Authentication', path: '/technology/management/aaa/authentication' }
        ],
        target: 'Local: N/A, AAA: Delta ≥ 0',
        targetInterpretation: 'Local accounts for DR, centralized AAA for normal operations',
        scoringRationale: 'Local AAA: (percentage / 100) × 4. AAA servers: (percentage / 100) × 5.',
        maxPoints: 9,
        recommendations: [
          'Maintain local emergency accounts',
          'Use centralized AAA for normal authentication',
          'Limit shared account usage'
        ]
      },
      {
        id: '8.3.2',
        name: 'Strong cryptography for authentication factors during transmission/storage',
        description: 'Enumerate devices with telnet - transmits credentials in clear text',
        ipFabricContext: 'Clear text telnet protocol left enabled',
        ipFabricInfo: 'Telnet transmits authentication credentials unencrypted',
        apiEndpoint: '/tables/security/enabled-telnet',
        guiPath: 'Technology/Management/Telnet access',
        target: '0%',
        targetInterpretation: 'Zero telnet usage',
        scoringRationale: '((100 - percentage) / 100) × 6. Example: 3% = 97% of 6 = 5.82',
        maxPoints: 6,
        reversePolarity: true,
        remediation: {
          whenFailing: [
            'Disable telnet completely',
            'Use SSH with strong cryptographic algorithms',
            'Implement certificate-based authentication where possible'
          ]
        }
      }
    ]
  },
  '10': {
    requirementId: '10',
    name: 'Log and Monitor All Access to System Components and Cardholder Data',
    description: 'Logging mechanisms and the ability to track user activities are critical in preventing, detecting, or minimizing the impact of a data compromise. The presence of logs on all system components and in the CDE allows thorough tracking, alerting, and analysis when something does go wrong.',
    applicableToNetworkInfrastructure: true,
    subRequirements: [
      {
        id: '10.2.1',
        name: 'Audit logs enabled and active for all system components',
        description: 'Track local and remote logging deployment across network devices',
        ipFabricContext: 'Local Logging + Remote Logging',
        ipFabricInfo: 'Shows devices with local system message logging and remote logging targets configured',
        dataSources: [
          { name: 'Local Logging', path: '/technology/management/logging/local-services' },
          { name: 'Remote Logging', path: '/technology/management/logging/remote-services' }
        ],
        target: '100%',
        targetInterpretation: 'All devices should have logging enabled',
        scoringRationale: 'Local: (percentage / 100) × 5. Remote: (percentage / 100) × 5. Example: Local 85% = 4.25, Remote 59% = 2.95',
        maxPoints: 10,
        recommendations: [
          'Enable local logging on all devices',
          'Configure remote logging to centralized SIEM',
          'Set appropriate logging levels'
        ],
        remediation: {
          whenFailing: [
            'Enable local logging for troubleshooting',
            'Configure remote syslog servers',
            'Verify logging functionality with test messages'
          ]
        }
      },
      {
        id: '10.6.1-10.6.2',
        name: 'System clocks synchronized using time-synchronization technology',
        description: 'Track NTP configuration and synchronization state',
        ipFabricContext: 'NTP configured and synchronized',
        ipFabricInfo: 'NTP sources and synchronization state per device. Time critical for logging correlation.',
        apiEndpoint: '/tables/management/ntp/summary',
        guiPath: 'Technology/Management/NTP',
        target: '100%',
        targetInterpretation: 'All devices should have synchronized time',
        scoringRationale: '(percentage / 100) × 5. Example: 65% = 3.25 points',
        maxPoints: 5,
        recommendations: [
          'Configure NTP on all devices',
          'Verify NTP synchronization (not just configuration)',
          'Use redundant NTP sources'
        ]
      }
    ]
  },
  '11': {
    requirementId: '11',
    name: 'Test Security of Systems and Networks Regularly',
    description: 'Vulnerabilities are discovered continually by malicious individuals and researchers. System components, processes, and software should be tested frequently to ensure security controls continue to reflect a changing environment.',
    applicableToNetworkInfrastructure: true,
    subRequirements: [
      {
        id: '11.2.2',
        name: 'Inventory of authorized wireless access points maintained with business justification',
        description: 'Track all discovered wireless access points',
        ipFabricContext: 'Authorized/discovered wireless AP inventory',
        ipFabricInfo: 'Details of all wireless Access Points in the network (via controller or wired discovery). For wired-only networks with 0 APs, full compliance is awarded as there is nothing to inventory per PCI DSS 11.2.2.',
        apiEndpoint: '/tables/wireless/access-points',
        guiPath: 'Technology/Wireless/Access-Points',
        target: 'Delta ≥ 0 (or 0 APs for wired-only)',
        targetInterpretation: 'Wireless infrastructure should be inventoried and tracked. Wired-only networks (0 APs) are compliant - no authorized APs means nothing to inventory.',
        scoringRationale: 'Full 5 points if: (1) Wired-only network with 0 APs (compliant), or (2) Delta >= 0 for networks with wireless. Data Unavailable = 0 points.',
        maxPoints: 5,
        deltaScoring: true,
        recommendations: [
          'Maintain complete wireless AP inventory',
          'Document business justification for each AP',
          'Regularly scan for rogue access points (required by 11.2.1 even for wired-only)',
          'For wired-only networks, ensure discovery can detect wireless if deployed'
        ]
      }
    ]
  },
  '12': {
    requirementId: '12',
    name: 'Support Information Security with Organizational Policies and Programs',
    description: 'The organization\'s overall information security policy sets the tone for the whole entity and informs personnel what is expected of them. Risks to the cardholder data environment are formally identified, evaluated, and managed.',
    applicableToNetworkInfrastructure: true,
    subRequirements: [
      {
        id: '12.3.4-12.5.1-devices',
        name: 'Hardware/software inventory maintained and reviewed',
        description: 'Automatic discovery and inventory of network devices',
        ipFabricContext: 'Devices',
        ipFabricInfo: 'Automatic discovery and inventory for all network devices and sites. Infrastructure should not change unless planned.',
        apiEndpoint: '/tables/inventory/devices',
        guiPath: 'Inventory/Devices',
        target: 'Delta ≥ 0',
        targetInterpretation: 'Device count tracking demonstrates inventory capability',
        scoringRationale: 'Full 5 points if both snapshots have >0 devices, else 0. Delta used for coloring only.',
        maxPoints: 5,
        deltaScoring: true,
        recommendations: [
          'Maintain continuous network discovery',
          'Track all device additions/removals',
          'Document infrastructure changes'
        ]
      },
      {
        id: '12.3.4-12.5.1-sites',
        name: 'Inventory includes site/location context',
        description: 'Track network sites for contextual inventory',
        ipFabricContext: 'Sites',
        ipFabricInfo: 'Site-based inventory provides context and segmentation',
        apiEndpoint: '/tables/inventory/sites',
        guiPath: 'Inventory/Sites',
        target: 'Delta ≥ 0',
        targetInterpretation: 'Site tracking demonstrates inventory contextualization',
        scoringRationale: 'Full 5 points if both snapshots have >0 sites, else 0. Delta used for coloring only.',
        maxPoints: 5,
        deltaScoring: true
      },
      {
        id: '12.3.4-12.5.1-platforms',
        name: 'Hardware/software technologies reviewed',
        description: 'Track unique platform types in use',
        ipFabricContext: 'Unique platform or family types',
        ipFabricInfo: 'Provides information about software platforms and OS versions running on network devices',
        apiEndpoint: '/tables/inventory/summary/platforms',
        dataSources: [
          { name: 'Platforms', path: '/inventory/devices/platforms' }
        ],
        target: 'N/A',
        targetInterpretation: 'Platform diversity tracking for technology review',
        scoringRationale: 'Full 5 points if both snapshots have >0 platforms, else 0.',
        maxPoints: 5,
        deltaScoring: false
      },
      {
        id: '12.3.4-12.5.1-variance',
        name: 'Software version consistency maintained',
        description: 'Track highest NOS version variance across platform families',
        ipFabricContext: 'Highest NOS Version Variance',
        ipFabricInfo: 'Across all NOS families, what is the greatest version variance? Lower variance means simpler support and lifecycle management.',
        apiEndpoint: '/tables/inventory/os-version-consistency/models',
        dataSources: [
          { name: 'OS Versions', path: '/inventory/os-versions/models' }
        ],
        target: '3 or less versions',
        targetInterpretation: 'Baseline of ≤3 versions for lifecycle management (n-1, n, n+1)',
        scoringRationale: 'Variance 1-3 = 5pts, 3-5 = 3pts, 6-10+ = 1pt',
        maxPoints: 5,
        recommendations: [
          'Standardize OS versions within platform families',
          'Maintain n-1, n, n+1 lifecycle pattern',
          'Plan upgrades to reduce version spread'
        ]
      }
    ]
  }
}

/**
 * Get a specific PCI-DSS requirement description
 */
export function getRequirementDescription(requirementId: string): PCIDSSRequirementDescription | undefined {
  return PCI_DSS_REQUIREMENTS[requirementId]
}

/**
 * Get all PCI-DSS requirement descriptions
 */
export function getAllRequirementDescriptions(): PCIDSSRequirementDescription[] {
  return Object.values(PCI_DSS_REQUIREMENTS)
}

/**
 * Get a specific sub-requirement description
 */
export function getSubRequirementDescription(
  requirementId: string,
  subRequirementId: string
): PCIDSSSubRequirement | undefined {
  const requirement = PCI_DSS_REQUIREMENTS[requirementId]
  if (!requirement) return undefined
  return requirement.subRequirements.find(sr => sr.id === subRequirementId)
}
