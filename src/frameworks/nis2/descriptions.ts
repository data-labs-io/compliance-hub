/**
 * NIS2 Directive - Article and Check Descriptions
 * Based on NIS2-rapid-analysis-mockup-v5.pdf
 *
 * Provides:
 * - Full article descriptions (8 articles across 2 chapters)
 * - Check-level details
 * - IP Fabric context and data sources
 * - Scoring rationales
 * - Target values and remediation guidance
 */

export interface DataSource {
  name: string
  path: string
}

export interface CheckDescription {
  id: string
  name: string
  description: string
  ipFabricContext: string
  ipFabricInfo: string
  dataSources?: DataSource[]
  target?: string
  targetInterpretation?: string
  scoringRationale?: string
  maxPoints: number
  reversePolarity?: boolean
  requiresComparativeSnapshot?: boolean
  recommendations?: string[]
  remediation?: {
    whenFailing: string[]
    whenWarning?: string[]
    bestPractices?: string[]
  }
}

export interface ArticleDescription {
  articleId: string
  name: string
  description: string
  chapterId: string
  chapterName: string
  subcategories: CheckDescription[]
  applicableToNetworkInfrastructure: boolean
}

export const NIS2_DESCRIPTIONS: Record<string, ArticleDescription> = {
  '21.2.B': {
    articleId: '21.2.B',
    name: 'Incident Handling',
    description: 'Incident handling capabilities including device inventory, time synchronisation, DNS management, logging infrastructure, configuration tracking, security policy enforcement, and network topology visibility.',
    chapterId: 'IV',
    chapterName: 'Cybersecurity Risk-management Measures and Reporting Obligations',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      {
        id: '21.2.B-devices',
        name: 'Device Inventory',
        description: 'Automatic discovery and inventory for all network devices and sites.',
        ipFabricContext: 'Devices',
        ipFabricInfo: 'Comprehensive view of physical devices within the network infrastructure. For infrastructure there should be no change unless planned.',
        dataSources: [{ name: 'Device Inventory', path: '/inventory/devices' }],
        target: 'Delta ≥ 0',
        targetInterpretation: 'Stable or growing device count indicates maintained visibility.',
        scoringRationale: 'Full score of 5 as long as inventory returns > 0 devices.',
        maxPoints: 5
      },
      {
        id: '21.2.B-sites',
        name: 'Site Inventory',
        description: 'Network sites contextualisation for incident response.',
        ipFabricContext: 'Sites',
        ipFabricInfo: 'Network sites allow contextualisation of inventory for localised incident handling.',
        dataSources: [{ name: 'Site Inventory', path: '/inventory/sites' }],
        target: 'Delta ≥ 0',
        scoringRationale: 'Full score of 5 as long as site inventory returns > 0 sites.',
        maxPoints: 5
      },
      {
        id: '21.2.B-ntp',
        name: 'NTP Configured and Synchronised',
        description: 'NTP sources and synchronization state per device.',
        ipFabricContext: 'NTP configured and synchronised',
        ipFabricInfo: 'Time underpins all local and remote logging including many aspects of system and organisation wide automation and functionality.',
        dataSources: [{ name: 'NTP Summary', path: '/technology/management/ntp' }],
        target: '100%',
        targetInterpretation: 'All devices should have NTP configured and synchronised.',
        scoringRationale: 'Percentage of NTP-configured devices × max 5 points.',
        maxPoints: 5
      },
      {
        id: '21.2.B-dns-coverage',
        name: 'IPv4 Addresses in DNS',
        description: 'Forward and reverse DNS entries for infrastructure device IPv4 addresses.',
        ipFabricContext: 'Device Based IPv4 Addresses in DNS',
        ipFabricInfo: 'IPv4 addresses configured on infrastructure devices and whether they are in DNS for both forward and reverse entries. Aids troubleshooting incidents.',
        dataSources: [{ name: 'IPv4 Hosts', path: '/inventory/hosts/ipv4-hosts' }],
        target: '100%',
        scoringRationale: 'Percentage of IPs with both forward and reverse DNS × max 5 points.',
        maxPoints: 5
      },
      {
        id: '21.2.B-dns-resolvers',
        name: 'DNS Resolvers Configured',
        description: 'Inventory of configured DNS servers on managed network devices.',
        ipFabricContext: 'DNS resolvers or caches configured',
        ipFabricInfo: 'DNS resolution is fundamental to network operations and incident investigation.',
        dataSources: [{ name: 'DNS Resolver', path: '/technology/management/dns-resolver' }],
        target: 'Delta ≥ 0',
        scoringRationale: 'Full score of 5 if DNS resolvers return data.',
        maxPoints: 5
      },
      {
        id: '21.2.B-local-logging',
        name: 'Local Logging',
        description: 'Devices with local system message logging configured.',
        ipFabricContext: 'Local Logging',
        ipFabricInfo: 'Local logging is crucial for localised troubleshooting and debugging when there is a failure to remote log.',
        dataSources: [{ name: 'Local Logging', path: '/management/logging/local-services' }],
        target: '100%',
        scoringRationale: 'Percentage of devices with local logging × max 5 points.',
        maxPoints: 5
      },
      {
        id: '21.2.B-remote-logging',
        name: 'Remote Logging',
        description: 'Devices with remote system message logging targets.',
        ipFabricContext: 'Remote Logging',
        ipFabricInfo: 'Critical for operations, security, capacity management. Not all devices support remote logging or may use centralised controllers.',
        dataSources: [{ name: 'Remote Logging', path: '/technology/management/logging/remote-services' }],
        target: '100%',
        scoringRationale: 'Percentage of devices with remote logging × max 5 points.',
        maxPoints: 5
      },
      {
        id: '21.2.B-config',
        name: 'Configuration Management',
        description: 'Configuration files tracked and compared between snapshots.',
        ipFabricContext: 'Device Configuration Management',
        ipFabricInfo: 'Identify unauthorized changes to network security control configurations.',
        dataSources: [{ name: 'Configuration', path: '/management/configuration' }],
        target: 'Delta ≥ 0',
        scoringRationale: 'Full score of 5 if configs tracked in both snapshots and delta ≥ 0.',
        maxPoints: 5,
        requiresComparativeSnapshot: true
      },
      {
        id: '21.2.B-acl',
        name: 'ACL Policies',
        description: 'Enumerates access control list rulesets.',
        ipFabricContext: 'Enumerate all ACL Policies',
        ipFabricInfo: 'ACL policies indicate enforcement and granularity of access controls.',
        dataSources: [{ name: 'Access Lists', path: '/technology/security/access-list' }],
        target: 'Delta ≥ 0',
        scoringRationale: 'Full score of 5 if ACL count > 0 in both snapshots and delta ≥ 0.',
        maxPoints: 5,
        requiresComparativeSnapshot: true
      },
      {
        id: '21.2.B-zonefw',
        name: 'Zone Firewall Policies',
        description: 'Enumerates zone firewall rulesets.',
        ipFabricContext: 'Enumerate all Zone Firewall Policies',
        ipFabricInfo: 'Zone firewall policies indicate segmentation and enforcement granularity.',
        dataSources: [{ name: 'Zone Firewall', path: '/technology/security/zone-firewall' }],
        target: 'Delta ≥ 0',
        scoringRationale: 'Full score of 5 if zone FW count > 0 in both snapshots and delta ≥ 0.',
        maxPoints: 5,
        requiresComparativeSnapshot: true
      },
      {
        id: '21.2.B-ebgp',
        name: 'eBGP Neighbours',
        description: 'Enumerate eBGP neighbours for external connectivity monitoring.',
        ipFabricContext: 'Enumerate eBGP Neighbours',
        ipFabricInfo: 'External BGP neighbours should remain stable. Changes may indicate connectivity issues.',
        dataSources: [{ name: 'BGP Neighbours', path: '/technology/routing/bgp/neighbours' }],
        target: 'Delta ≤ 0',
        scoringRationale: 'Full score of 5 if eBGP count stable or decreasing.',
        maxPoints: 5,
        reversePolarity: true,
        requiresComparativeSnapshot: true
      },
      {
        id: '21.2.B-diagrams',
        name: 'Automatic Diagramming',
        description: 'Full topology, site, L3, or L2 diagrams available.',
        ipFabricContext: 'Automatic Diagramming',
        ipFabricInfo: 'Network diagrams provide visual context for incident response and investigation.',
        dataSources: [{ name: 'Topology', path: '/diagrams/topology-tree' }],
        target: 'N/A',
        scoringRationale: 'Full score of 5 if diagrams can be generated.',
        maxPoints: 5
      }
    ]
  },

  '21.2.C': {
    articleId: '21.2.C',
    name: 'Business Continuity',
    description: 'Business continuity including backup management, disaster recovery, and crisis management through comprehensive discovery, device inventory, platform tracking, and configuration management.',
    chapterId: 'IV',
    chapterName: 'Cybersecurity Risk-management Measures and Reporting Obligations',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      { id: '21.2.C-discovery', name: 'Discovery Issues', description: 'Comprehensive and complete discovery for configuration management and redeployments.', ipFabricContext: 'Discovery Issues', ipFabricInfo: 'Enumerate devices with problems during discovery to fix them for complete visibility.', dataSources: [{ name: 'Snapshot Management', path: '/snapshot-management' }], target: '≤ 0', scoringRationale: 'Tiered: 0 errors = 5pts, 1-10 = 4pts, etc.', maxPoints: 5, reversePolarity: true },
      { id: '21.2.C-devices', name: 'Device Inventory', description: 'Automatic discovery for disaster recovery planning.', ipFabricContext: 'Devices', ipFabricInfo: 'Comprehensive view for backup management.', maxPoints: 5 },
      { id: '21.2.C-sites', name: 'Site Inventory', description: 'Sites for business continuity planning.', ipFabricContext: 'Sites', ipFabricInfo: 'Site context for disaster recovery.', maxPoints: 5 },
      { id: '21.2.C-platforms', name: 'Platform Types', description: 'Software platforms and OS versions for recovery planning.', ipFabricContext: 'Unique platform or family types', ipFabricInfo: 'Platform diversity tracking for spares and recovery.', dataSources: [{ name: 'Platforms', path: '/inventory/platforms' }], maxPoints: 5 },
      { id: '21.2.C-config', name: 'Configuration Management', description: 'Configuration tracking for recovery capability.', ipFabricContext: 'Device Configuration Management', ipFabricInfo: 'Configuration files for recovery and redeployment.', maxPoints: 5, requiresComparativeSnapshot: true }
    ]
  },

  '21.2.D': {
    articleId: '21.2.D',
    name: 'Supply Chain Security',
    description: 'Supply chain security including security-related aspects concerning relationships between entities and their direct suppliers or service providers.',
    chapterId: 'IV',
    chapterName: 'Cybersecurity Risk-management Measures and Reporting Obligations',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      { id: '21.2.D-acl', name: 'ACL Policies', description: 'Access controls for supply chain boundaries.', ipFabricContext: 'Enumerate all ACL Policies', ipFabricInfo: 'ACL policies for controlling supply chain access.', maxPoints: 5, requiresComparativeSnapshot: true },
      { id: '21.2.D-zonefw', name: 'Zone Firewall Policies', description: 'Firewall segmentation for supply chain.', ipFabricContext: 'Enumerate all Zone Firewall Policies', ipFabricInfo: 'Zone firewall for supply chain segmentation.', maxPoints: 5, requiresComparativeSnapshot: true },
      { id: '21.2.D-ebgp', name: 'eBGP Neighbours', description: 'External connectivity for supply chain monitoring.', ipFabricContext: 'Enumerate eBGP Neighbours', ipFabricInfo: 'BGP neighbours for supply chain connectivity tracking.', maxPoints: 5, reversePolarity: true, requiresComparativeSnapshot: true },
      { id: '21.2.D-diagrams', name: 'Automatic Diagramming', description: 'Topology visibility for supply chain.', ipFabricContext: 'Automatic Diagramming', ipFabricInfo: 'Visual supply chain network mapping.', maxPoints: 5 }
    ]
  },

  '21.2.E': {
    articleId: '21.2.E',
    name: 'Vulnerability Handling',
    description: 'Security in network and information systems acquisition, development and maintenance, including vulnerability handling and disclosure.',
    chapterId: 'IV',
    chapterName: 'Cybersecurity Risk-management Measures and Reporting Obligations',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      { id: '21.2.E-eos', name: 'Lifecycle Management (End of Support)', description: 'End of Life milestones and End of Support device tracking.', ipFabricContext: 'Lifecycle Management (End of *)', ipFabricInfo: 'Reports on End of Life milestones; looking for devices that are End of Support.', dataSources: [{ name: 'End of Life Milestones', path: '/inventory/end-of-life-milestones' }], target: '0%', targetInterpretation: 'Zero EoS devices indicates properly maintained infrastructure.', scoringRationale: '(100 - EoS%) / 100 × 5 points.', maxPoints: 5, reversePolarity: true }
    ]
  },

  '21.2.F': {
    articleId: '21.2.F',
    name: 'Risk Management Assessment',
    description: 'Policies and procedures to assess the effectiveness of cybersecurity risk-management measures.',
    chapterId: 'IV',
    chapterName: 'Cybersecurity Risk-management Measures and Reporting Obligations',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      { id: '21.2.F-aaa', name: 'TACACS/RADIUS Configured', description: 'Credential management configurations across network devices.', ipFabricContext: 'TACACS and RADIUS servers configured on device', ipFabricInfo: 'Verify proper authentication mechanisms and identify weak authentication methods.', dataSources: [{ name: 'AAA Authentication', path: '/management/aaa/authentication' }], target: 'Delta ≥ 0', scoringRationale: 'AAA percentage × max 5 points.', maxPoints: 5 },
      { id: '21.2.F-telnet', name: 'Telnet Protocol Disabled', description: 'Managed devices where telnet protocol is enabled.', ipFabricContext: 'Clear text telnet protocol left enabled', ipFabricInfo: 'Telnet transmits credentials in clear text and should be eliminated.', dataSources: [{ name: 'Telnet Access', path: '/technology/management/telnet-access' }], target: '0%', scoringRationale: '(100 - telnet%) / 100 × 5 points.', maxPoints: 5, reversePolarity: true },
      { id: '21.2.F-local-log', name: 'Local Logging', description: 'Local logging for risk assessment.', ipFabricContext: 'Local Logging', ipFabricInfo: 'Local logging for effectiveness assessment.', maxPoints: 5 },
      { id: '21.2.F-remote-log', name: 'Remote Logging', description: 'Remote logging for centralised risk monitoring.', ipFabricContext: 'Remote Logging', ipFabricInfo: 'Remote logging for centralised monitoring.', maxPoints: 5 },
      { id: '21.2.F-any-acl', name: 'ACL ANY/ANY Policies', description: 'Overly promiscuous ACL rulesets.', ipFabricContext: 'ACL policies that permit ANY/ANY', ipFabricInfo: 'Very few valid use cases for ANY/ANY rules; they should be decreasing.', dataSources: [{ name: 'Access Lists', path: '/technology/security/access-list' }], target: 'Delta ≤ 0', scoringRationale: 'Full score if delta ≤ 0 (same or decreasing).', maxPoints: 5, reversePolarity: true, requiresComparativeSnapshot: true },
      { id: '21.2.F-any-fw', name: 'FW ANY/ANY Policies', description: 'Overly promiscuous zone firewall rulesets.', ipFabricContext: 'FW policies that permit ANY/ANY', ipFabricInfo: 'Overly permissive firewall rules should be eliminated.', dataSources: [{ name: 'Zone Firewall', path: '/technology/security/zone-firewall' }], target: 'Delta ≤ 0', scoringRationale: 'Full score if delta ≤ 0.', maxPoints: 5, reversePolarity: true, requiresComparativeSnapshot: true }
    ]
  },

  '21.2.H': {
    articleId: '21.2.H',
    name: 'Cryptography & Encryption',
    description: 'Policies and procedures regarding the use of cryptography and, where appropriate, encryption.',
    chapterId: 'IV',
    chapterName: 'Cybersecurity Risk-management Measures and Reporting Obligations',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      { id: '21.2.H-telnet', name: 'Clear-text Telnet Disabled', description: 'Elimination of clear-text management protocols.', ipFabricContext: 'Clear text telnet protocol left enabled', ipFabricInfo: 'Telnet uses unencrypted communications; SSH should be used instead.', target: '0%', scoringRationale: '(100 - telnet%) / 100 × 5 points.', maxPoints: 5, reversePolarity: true },
      { id: '21.2.H-8021x', name: '802.1X Secure Ports', description: 'Devices and ports running 802.1X port security.', ipFabricContext: 'All 802.1x enabled network devices', ipFabricInfo: '802.1X provides encrypted network access control.', dataSources: [{ name: 'Secure Ports', path: '/technology/security/secure-ports-802.1x' }], target: '100%', scoringRationale: '802.1X percentage × max 5 points.', maxPoints: 5 }
    ]
  },

  '21.2.I': {
    articleId: '21.2.I',
    name: 'Access Control & Asset Management',
    description: 'Human resources security, access control policies and asset management.',
    chapterId: 'IV',
    chapterName: 'Cybersecurity Risk-management Measures and Reporting Obligations',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      { id: '21.2.I-acl', name: 'ACL Policies', description: 'Access control enforcement.', ipFabricContext: 'Enumerate all ACL Policies', ipFabricInfo: 'ACL policies for resource access control.', maxPoints: 5, requiresComparativeSnapshot: true },
      { id: '21.2.I-zonefw', name: 'Zone Firewall Policies', description: 'Firewall-based access segmentation.', ipFabricContext: 'Enumerate all Zone Firewall Policies', ipFabricInfo: 'Zone FW for access segmentation.', maxPoints: 5, requiresComparativeSnapshot: true },
      { id: '21.2.I-aaa', name: 'TACACS/RADIUS Configured', description: 'Authentication for asset access.', ipFabricContext: 'TACACS and RADIUS servers configured', ipFabricInfo: 'Credential management for access control.', maxPoints: 5 },
      { id: '21.2.I-devices', name: 'Device Inventory', description: 'Asset inventory for access management.', ipFabricContext: 'Devices', ipFabricInfo: 'Comprehensive asset inventory.', maxPoints: 5 },
      { id: '21.2.I-config', name: 'Configuration Management', description: 'Configuration tracking for asset management.', ipFabricContext: 'Device Configuration Management', ipFabricInfo: 'Config tracking for access control changes.', maxPoints: 5, requiresComparativeSnapshot: true },
      { id: '21.2.I-eos', name: 'Lifecycle Management', description: 'End of Support asset tracking.', ipFabricContext: 'Lifecycle Management (End of *)', ipFabricInfo: 'EoS devices requiring lifecycle management.', maxPoints: 5, reversePolarity: true },
      { id: '21.2.I-discovery', name: 'Discovery Issues', description: 'Discovery completeness for asset management.', ipFabricContext: 'Discovery Issues', ipFabricInfo: 'Effective asset management requires complete discovery.', maxPoints: 5, reversePolarity: true }
    ]
  },

  '27.2.F': {
    articleId: '27.2.F',
    name: 'Entity IP Ranges',
    description: 'The entity\'s IP ranges. Independent visibility of all managed hosts that may be configured with public IP ranges.',
    chapterId: 'V',
    chapterName: 'Jurisdiction and Registration',
    applicableToNetworkInfrastructure: true,
    subcategories: [
      { id: '27.2.F-discovery', name: 'Discovery Issues', description: 'Discovery for independent IP range visibility.', ipFabricContext: 'Discovery Issues', ipFabricInfo: 'Independent visibility of managed hosts with public IP ranges not in IPAM.', maxPoints: 5, reversePolarity: true },
      { id: '27.2.F-ipv4routes', name: 'IPv4 Routing Tables', description: 'Cumulative IPv4 routing table from all managed devices.', ipFabricContext: 'IPv4 Routing Tables', ipFabricInfo: 'All entries from all routing tables and VRFs for IP range visibility.', dataSources: [{ name: 'IPv4 Routes', path: '/technology/routing/tables' }], target: 'Delta ≥ 0', scoringRationale: 'Full score if IPv4 routes return > 0 prefixes.', maxPoints: 5 },
      { id: '27.2.F-ipv6routes', name: 'IPv6 Routing Tables', description: 'Cumulative IPv6 routing table from all managed devices.', ipFabricContext: 'IPv6 Routing Tables', ipFabricInfo: 'IPv6 route inventory for complete IP range registration.', dataSources: [{ name: 'IPv6 Routes', path: '/technology/routing/tables' }], target: 'Delta ≥ 0', scoringRationale: 'Full score if IPv6 routes return > 0 prefixes.', maxPoints: 5 }
    ]
  }
}

/**
 * Get description for a specific NIS2 article
 */
export function getNIS2Description(articleId: string): ArticleDescription | undefined {
  return NIS2_DESCRIPTIONS[articleId]
}
