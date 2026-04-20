/**
 * Comprehensive control and safeguard descriptions for all compliance frameworks
 * Extracted from official documentation and gap analysis reports
 *
 * This configuration provides:
 * - Full control descriptions
 * - Safeguard-level details
 * - IP Fabric context and data sources
 * - Scoring rationales
 * - Target values and interpretation
 */

export interface SafeguardDescription {
  id: string
  name: string
  description: string
  ipFabricContext: string
  ipFabricInfo: string
  apiEndpoint?: string
  guiPath?: string
  target?: string
  targetInterpretation?: string
  scoringRationale?: string
  maxPoints: number
  reversePolarity?: boolean // true for metrics where decrease is good (errors, telnet, etc.)
  recommendations?: string[] // Actionable steps to improve this safeguard
  remediation?: {
    whenFailing: string[]
    whenWarning?: string[]
    bestPractices?: string[]
  }
}

export interface ControlDescription {
  controlId: string
  name: string
  description: string
  safeguards: SafeguardDescription[]
  implementationGroup?: string // IG1, IG2, IG3 for CIS
  applicableToNetworkInfrastructure: boolean
}

/**
 * CIS Controls v8.1 - Full Descriptions and Safeguards
 * Based on CIS-CONTROLS-gap-analysis-mockup-v6.pdf
 */
export const CIS_CONTROL_DESCRIPTIONS: Record<string, ControlDescription> = {
  '1': {
    controlId: '1',
    name: 'Inventory and Control of Enterprise Assets',
    description: 'Actively manage (inventory, track, and correct) all enterprise assets (end-user devices, including portable and mobile; network devices; non-computing/Internet of Things (IoT) devices; and servers) connected to the infrastructure physically, virtually, remotely, and those within cloud environments, to accurately know the totality of assets that need to be monitored and protected within the enterprise. This will also support identifying unauthorized and unmanaged assets to remove or remediate.',
    implementationGroup: 'IG1',
    applicableToNetworkInfrastructure: true,
    safeguards: [
      {
        id: '1.1',
        name: 'Establish and Maintain Detailed Enterprise Asset Inventory',
        description: 'Establish and maintain an accurate, detailed, and up-to-date inventory of all enterprise assets with the potential to store or process data, to include: end-user devices (including portable and mobile), network devices, non-computing/IoT devices, and servers.',
        ipFabricContext: 'Devices',
        ipFabricInfo: 'Automatic discovery and inventory for all network devices and sites, providing a comprehensive view of physical devices within the network infrastructure. For infrastructure there should be no change unless planned.',
        apiEndpoint: '/tables/inventory/devices',
        guiPath: 'Inventory/Devices',
        target: 'N/A',
        targetInterpretation: 'Maintaining comprehensive device inventory is essential. Unexpected decreases may indicate loss of visibility.',
        scoringRationale: 'Device count >0 earns 3 points, Site count >0 earns 3 points. As long as we are running inventory and contextualizing it across sites, we demonstrate strong asset management.',
        maxPoints: 6
      },
      {
        id: '1.2',
        name: 'Address Unauthorized Assets',
        description: 'Ensure that only authorized assets are given access to the enterprise network. Identify unauthorized assets and remove their access until they can be identified and authorized.',
        ipFabricContext: 'Discovery Issues',
        ipFabricInfo: 'Fundamental to risk and asset management is comprehensive and complete discovery. Here we can enumerate and adjust for devices that are unmanaged and/or have problems during discovery by highlighting the most common occurrences that allow us to incorporate and fix them for complete visibility.',
        apiEndpoint: '/tables/reports/discovery-errors',
        guiPath: 'Snapshot Management',
        target: '≤0',
        targetInterpretation: 'Zero discovery issues indicates complete network visibility. Each unresolved issue represents potential security blind spots.',
        scoringRationale: 'Out of a possible 3 points: 0-10 discovery errors penalizes by -1, 11-30 errors penalizes by -2, and 31+ errors penalizes by -3 (total 0 in worst case). This is somewhat arbitrary but provides graduated penalties for increasing visibility gaps.',
        maxPoints: 3,
        reversePolarity: true,
        remediation: {
          whenFailing: [
            'Review discovery error logs in IP Fabric Snapshot Management',
            'Verify SNMP/SSH credentials are correct for all device types',
            'Check network connectivity to devices with discovery issues',
            'Review firewall rules to ensure IP Fabric can reach all segments',
            'Update seed IP ranges to include all network segments'
          ],
          bestPractices: [
            'Run discovery snapshots regularly to catch new issues quickly',
            'Maintain up-to-date credential vault in IP Fabric',
            'Document expected device counts per site for validation',
            'Set up alerts for discovery error thresholds'
          ]
        }
      },
      {
        id: '1.3',
        name: 'Utilize an Active Discovery Tool',
        description: 'Utilize an active discovery tool to identify assets connected to the enterprise network. Configure the active discovery tool to execute daily, or more frequently.',
        ipFabricContext: 'Intent Checks (160+)',
        ipFabricInfo: 'These intent checks empower organizations to both understand and manage risk. IP Fabric provides unmatched visibility into the network infrastructure, data, flows, and digital boundaries for the purposes of network assurance and cybersecurity.',
        apiEndpoint: 'GET /api/v7.3/reports',
        guiPath: 'Intent Verification',
        target: '≥0',
        targetInterpretation: 'Having active intent checks configured demonstrates continuous monitoring capabilities. The count should remain stable or increase as monitoring coverage expands.',
        scoringRationale: 'Should always be 1 point as long as some/any "Intent Checks" return data, but if no "Intent Checks" return data and all reports are empty then we would score this as 0 and everything hereon in will fail or be flagged as lacking active monitoring.',
        maxPoints: 1
      }
    ]
  },

  '2': {
    controlId: '2',
    name: 'Inventory and Control of Software Assets',
    description: 'Actively manage (inventory, track, and correct) all software (operating systems and applications) on the network so that only authorized software is installed and can execute, and that unauthorized and unmanaged software is found and prevented from installation or execution.',
    implementationGroup: 'IG1',
    applicableToNetworkInfrastructure: true,
    safeguards: [
      {
        id: '2.1',
        name: 'Establish and Maintain a Software Inventory',
        description: 'Establish and maintain a detailed inventory of all licensed software installed on enterprise assets. The software inventory must document the title, publisher, initial install/use date, and business purpose for each entry.',
        ipFabricContext: 'Unique platform or family types',
        ipFabricInfo: 'Provides information about software platforms and NOS (Network Operating System) versions running on network devices.',
        apiEndpoint: '/tables/inventory/summary/platforms',
        guiPath: 'Inventory/Platforms',
        target: 'Delta ≤ 0',
        targetInterpretation: 'Stable or decreasing platform diversity indicates standardization. Increases may indicate sprawl or new technology adoption.',
        scoringRationale: 'As long as we get > 0 platforms then we earn full score of 4 points (we do not care about the exact value as long as we are actively tracking software inventory).',
        maxPoints: 4
      },
      {
        id: '2.4',
        name: 'Utilize Automated Software Inventory Tools',
        description: 'Utilize software inventory tools, when possible, throughout the enterprise to automate the discovery and documentation of installed software.',
        ipFabricContext: 'Highest NOS Version Variance',
        ipFabricInfo: 'Across all NOS families, what is the greatest version variance? Sometimes features, security, development or test can drive extra differences, not just lifecycle n-1, n, n+1, but more consistent fleet versions means simpler support (and +/-1 can address common more failures).',
        apiEndpoint: '/tables/inventory/os-version-consistency/models',
        guiPath: 'Inventory/OS Version Consistency',
        target: '3',
        targetInterpretation: 'Target variance of ≤3 versions (n-1, n, n+1) for lifecycle management. Higher variance increases complexity and support burden.',
        scoringRationale: 'For 1-3 versions then full score of 2 points. 4-5 versions earns 1 point, 6-10+ versions earns 0 points. Rationale: Albeit different orgs may deploy a range of OS per model, we assume a baseline of 3 or less versions for lifecycle management e.g. (1) n-1, (2) n, and (3) n+1.',
        maxPoints: 2
      },
      {
        id: '2.2',
        name: 'Software Lifecycle Management',
        description: 'Ensure that only currently supported software is designated as authorized in the software inventory. Unsupported software should be tagged as unauthorized, and the development of a plan for replacing such software should be given priority.',
        ipFabricContext: 'Lifecycle Management (End of *)',
        ipFabricInfo: 'Reports on End of Life milestones and here we are looking for the number of devices that are End of Support. This tracks devices running software that is no longer receiving security updates.',
        apiEndpoint: '/tables/reports/eof/summary',
        guiPath: 'Inventory/End of Life Milestones',
        target: '0%',
        targetInterpretation: 'Zero devices on End of Support software is ideal. Each EoS device represents unpatched security vulnerabilities.',
        scoringRationale: 'Use 100 minus the latest snapshot percent to calculate a score with a max 4 points (so 2% EoS would be 98% × 4 = 3.92 points). This rewards organizations for maintaining current software.',
        maxPoints: 4,
        reversePolarity: true,
        remediation: {
          whenFailing: [
            'Identify all End of Support devices using IP Fabric EoL report',
            'Create upgrade project plan with timeline and budget',
            'Prioritize internet-facing and critical infrastructure devices',
            'Test upgrades in lab environment before production deployment',
            'Consider hardware refresh for devices beyond software EoL'
          ],
          whenWarning: [
            'Review vendor support lifecycle calendars',
            'Plan upgrades for devices approaching End of Support',
            'Budget for refresh cycles aligned with vendor lifecycles'
          ],
          bestPractices: [
            'Maintain n, n-1 version strategy for production devices',
            'Subscribe to vendor security advisories',
            'Document approved software versions',
            'Track End of Life dates in asset management system'
          ]
        }
      }
    ]
  },

  '3': {
    controlId: '3',
    name: 'Data Protection',
    description: 'Develop processes and technical controls to identify, classify, securely handle, retain, and dispose of data.',
    implementationGroup: 'IG1',
    applicableToNetworkInfrastructure: true,
    safeguards: [
      {
        id: '3.3',
        name: 'Configure Data Access Control Lists',
        description: 'Configure data access control lists based on a user\'s need to know. Apply data access control lists, also known as access permissions, to local and remote file systems, databases, and applications.',
        ipFabricContext: 'ACL policies that permit ANY/ANY',
        ipFabricInfo: 'Detects access control lists and security policies/zones with overly promiscuous rulesets (e.g., IP ANY ANY).',
        apiEndpoint: '/tables/security/acl or /tables/security/acl/global-policies',
        guiPath: 'Technology/Security/Access List',
        target: 'Delta ≤ 0',
        targetInterpretation: 'Decreasing ANY/ANY rules indicates tightening security posture. These rules are traditionally frowned upon as there are very few valid use cases for ANY/ANY policies.',
        scoringRationale: 'Max 2 points: subtract the value in Snapshot A from 20 and divide by 10. If Snapshot A ≥ 20 then score is 0. Example: 17 ANY/ANY rules = (20-17)/10 = 0.3 points.',
        maxPoints: 2,
        reversePolarity: true
      },
      {
        id: '3.8',
        name: 'Document Data Flows',
        description: 'Document data flows. Data flow documentation includes service provider, data type, data sensitivity/classification, storage location, and operational information that affects the security and privacy risk to the data.',
        ipFabricContext: 'Device Based IPv4 Addresses in DNS',
        ipFabricInfo: 'Information about every IPv4 address configured on infrastructure devices and whether they are in DNS for both forward and reverse entries. This aids troubleshooting and security analysis.',
        apiEndpoint: '/tables/addressing/managed-devs',
        guiPath: 'Inventory/Hosts/IPv4 Hosts',
        target: '100%',
        targetInterpretation: 'All infrastructure IPs should have DNS entries. Many orgs do not use PTR records well but we encourage it as it aids troubleshooting. Assumes IP Fabric has access to internal zone resolution.',
        scoringRationale: 'Use the latest snapshot percent for the score with a max score of 2 points (so 84% DNS coverage would be 1.68 points).',
        maxPoints: 2
      },
      {
        id: '3.10',
        name: 'Encrypt Sensitive Data in Transit',
        description: 'Encrypt Sensitive Data in Transit. Example implementations can include: Transport Layer Security (TLS) and Open Secure Shell (OpenSSH).',
        ipFabricContext: 'Clear text telnet protocol enabled',
        ipFabricInfo: 'Enumerates managed devices where telnet protocol is enabled. Telnet transmits data in clear text, including credentials, making it a security risk.',
        apiEndpoint: '/tables/security/enabled-telnet',
        guiPath: 'Technology/Management/Telnet access',
        target: '0%',
        targetInterpretation: 'Zero devices with telnet enabled is ideal. Telnet should be replaced with SSH for encrypted management access.',
        scoringRationale: 'Use the latest snapshot percent calculated for the score with a max score of 2 points (so 3% telnet usage would be 97% of 2 = 1.94 points).',
        maxPoints: 2,
        reversePolarity: true,
        remediation: {
          whenFailing: [
            'Identify all devices with telnet enabled using IP Fabric report',
            'Configure SSH on all devices with telnet currently enabled',
            'Test SSH connectivity before disabling telnet',
            'Update management scripts and tools to use SSH instead of telnet',
            'Disable telnet service on all network devices',
            'Apply ACLs to block telnet (port 23) if immediate removal is not possible'
          ],
          bestPractices: [
            'Use SSHv2 with strong encryption algorithms',
            'Implement key-based SSH authentication where possible',
            'Regularly rotate SSH keys and update passwords',
            'Monitor for any telnet re-enablement through IP Fabric alerts',
            'Document secure management access procedures'
          ]
        }
      },
      {
        id: '3.14',
        name: 'Log Sensitive Data Access',
        description: 'Log sensitive data access, including modification and disposal. The logs must include sufficient detail to determine who, what, when, where, and why access occurred.',
        ipFabricContext: 'Remote Logging & AAA Servers',
        ipFabricInfo: 'Devices with remote system message logging targets (and associated parameters). Shows configured credential management configurations across network devices.',
        apiEndpoint: '/tables/management/logging/remote and /tables/security/aaa/authentication',
        guiPath: 'Technology/Management/Logging/Remote Services',
        target: '100%',
        targetInterpretation: 'All critical infrastructure should have remote logging and AAA configured for security audit trails.',
        scoringRationale: 'Remote logging: max 1 point based on percentage (59% = 0.59). AAA configuration: max 1 point based on percentage (40% = 0.4). Combined for data access audit capability.',
        maxPoints: 2
      }
    ]
  },

  '4': {
    controlId: '4',
    name: 'Secure Configuration of Enterprise Assets and Software',
    description: 'Establish and maintain the secure configuration of enterprise assets (end-user devices, including portable and mobile; network devices; non-computing/IoT devices; and servers) and software (operating systems and applications).',
    implementationGroup: 'IG1',
    applicableToNetworkInfrastructure: true,
    safeguards: [
      {
        id: '4.6',
        name: 'Securely Manage Enterprise Assets and Software',
        description: 'Securely manage enterprise assets and software. Example implementations include managing configuration through version-controlled infrastructure as code and accessing administrative interfaces over secure network protocols.',
        ipFabricContext: 'Clear text telnet protocol enabled',
        ipFabricInfo: 'Enumerates managed devices where telnet protocol is enabled.',
        apiEndpoint: '/tables/security/enabled-telnet',
        guiPath: 'Technology/Management/Telnet access',
        target: '0%',
        targetInterpretation: 'Zero telnet usage demonstrates secure management practices.',
        scoringRationale: 'Use the latest snapshot percent for the score with a max score of 4 points (so 3% telnet = 97% of 4 = 3.88 points).',
        maxPoints: 4,
        reversePolarity: true
      },
      {
        id: '4.7',
        name: 'Manage Default Accounts on Enterprise Assets and Software',
        description: 'Manage default accounts on enterprise assets and software, such as root, administrator, and other pre-configured vendor accounts. Example implementations can include: disabling default accounts or making them unusable.',
        ipFabricContext: 'LOCAL user authentication accounts',
        ipFabricInfo: 'Authentication, Authorization and Accounting (AAA) local user accounts configured on managed network devices. Local accounts provide disaster recovery access capability.',
        apiEndpoint: '/tables/security/aaa/users',
        guiPath: 'Technology/Management/AAA/Local Users',
        target: 'N/A',
        targetInterpretation: 'Having backup local accounts on devices is important for disaster recovery, but they should be secured and monitored. Only a subset of devices will support local accounts.',
        scoringRationale: 'We assume that we should have backup local accounts on all capable devices, so from a max score of 4 points (52% coverage would be 2.08 points). This is for disaster recovery scenarios.',
        maxPoints: 4
      },
      {
        id: '4.9',
        name: 'Configure Trusted DNS Servers on Enterprise Assets',
        description: 'Configure trusted DNS servers on enterprise assets. Example implementations include: configuring assets to use enterprise-controlled DNS servers and/or reputable externally accessible DNS servers.',
        ipFabricContext: 'DNS resolvers or caches configured',
        ipFabricInfo: 'Inventory of configured DNS servers on managed network devices.',
        apiEndpoint: '/tables/management/dns/servers',
        guiPath: 'Technology/Management/DNS resolver',
        target: 'Delta ≥ 0',
        targetInterpretation: 'Stable or increasing DNS configurations demonstrates comprehensive DNS management across the infrastructure.',
        scoringRationale: 'By virtue of the fact that we are auditing, and as long as we get some data back, we will get the full score of 2 points, else 0. This demonstrates DNS visibility.',
        maxPoints: 2
      }
    ]
  },

  '5': {
    controlId: '5',
    name: 'Account Management',
    description: 'Use processes and tools to assign and manage authorization to credentials for user accounts, including administrator accounts, as well as service accounts to enterprise assets and software.',
    implementationGroup: 'IG1',
    applicableToNetworkInfrastructure: true,
    safeguards: [
      {
        id: '5.1',
        name: 'Manage Default Accounts on Enterprise Assets and Software',
        description: 'Use organizationally-managed accounts with strong, unique passphrases for administration of enterprise assets. Do not use default vendor account passwords.',
        ipFabricContext: 'LOCAL user authentication accounts',
        ipFabricInfo: 'Authentication, Authorization and Accounting (AAA) local user accounts configured on managed network devices.',
        apiEndpoint: '/tables/security/aaa/users',
        guiPath: 'Technology/Management/AAA/Local Users',
        target: '100%',
        targetInterpretation: 'All capable devices should have properly managed local accounts for disaster recovery.',
        scoringRationale: 'Max score of 5 points (52% coverage = 2.6 points). Only a subset of devices will support local accounts but for disaster recovery it can be extremely important.',
        maxPoints: 5
      },
      {
        id: '5.4',
        name: 'Restrict Administrator Privileges to Dedicated Administrator Accounts',
        description: 'Restrict administrator privileges to dedicated administrator accounts on enterprise assets. Conduct general computing activities, such as internet browsing, email, and productivity suite use, from the user\'s primary, non-privileged account.',
        ipFabricContext: 'TACACS and RADIUS servers configured on device (excl. cloud)',
        ipFabricInfo: 'Shows configured credential management configurations across network devices. Organizations can verify proper authentication mechanisms and identify weak authentication methods.',
        apiEndpoint: '/tables/security/aaa/authentication',
        guiPath: 'Management/AAA/Servers',
        target: 'Delta ≥ 0',
        targetInterpretation: 'Increasing AAA adoption demonstrates centralized access control. Only a subset of devices will support AAA (traditional route/switch) but it is extremely important.',
        scoringRationale: 'Use the latest snapshot percent for max 5 points (so 40% AAA coverage = 2 points). Only traditional route/switch infrastructure supports this.',
        maxPoints: 5
      }
    ]
  },

  '6': {
    controlId: '6',
    name: 'Access Control Management',
    description: 'Use processes and tools to create, assign, manage, and revoke access credentials and privileges for user, administrator, and service accounts for enterprise assets and software.',
    implementationGroup: 'IG1',
    applicableToNetworkInfrastructure: true,
    safeguards: [
      {
        id: '6.6',
        name: 'Establish and Maintain an Inventory of Authentication and Authorization Systems',
        description: 'Establish and maintain an inventory of the enterprise\'s authentication and authorization systems, including those hosted on-site or at a remote service provider.',
        ipFabricContext: 'TACACS and RADIUS servers configured on device (excl. cloud)',
        ipFabricInfo: 'Shows configured credential management configurations across network devices.',
        apiEndpoint: '/tables/security/aaa/authentication',
        guiPath: 'Management/AAA/Servers',
        target: 'Delta ≥ 0',
        targetInterpretation: 'Centralized authentication is critical for access control.',
        scoringRationale: 'Max 10 points based on percentage (40% = 4 points). Note: Not all devices support TACACS+ and/or Radius, with many supporting newer centralized, federated, or web based SSO/SAML models of AAA.',
        maxPoints: 10
      },
      {
        id: '6.7',
        name: 'Centralize Access Control',
        description: 'Centralize access control for all enterprise assets through a directory service or SSO provider, where supported.',
        ipFabricContext: 'TACACS and RADIUS servers configured on device (excl. cloud)',
        ipFabricInfo: 'Shows configured credential management configurations across network devices.',
        apiEndpoint: '/tables/security/aaa/authentication',
        guiPath: 'Management/AAA/Servers',
        target: 'Delta ≥ 0',
        targetInterpretation: 'Centralization reduces attack surface and improves auditability.',
        scoringRationale: 'Included in safeguard 6.6 scoring.',
        maxPoints: 0 // Combined with 6.6
      }
    ]
  },

  '8': {
    controlId: '8',
    name: 'Audit Log Management',
    description: 'Collect, alert, review, and retain audit logs of events that could help detect, understand, or recover from an attack.',
    implementationGroup: 'IG1',
    applicableToNetworkInfrastructure: true,
    safeguards: [
      {
        id: '8.2',
        name: 'Collect Audit Logs',
        description: 'Collect audit logs. Ensure that logging, per each enterprise asset, is enabled appropriately to support investigation of events and incident response capabilities.',
        ipFabricContext: 'Local Logging & Remote Logging',
        ipFabricInfo: 'Devices with local and remote system message logging configured (and associated parameters). Local logging supports localized troubleshooting, while remote logging enables centralized security monitoring.',
        apiEndpoint: '/tables/management/logging/local and /tables/management/logging/remote',
        guiPath: 'Technology/Management/Logging',
        target: '100%',
        targetInterpretation: 'All devices should have logging configured. Local logging for immediate troubleshooting, remote logging for security monitoring.',
        scoringRationale: 'Local logging: max 4 points (85% = 3.4 points). Remote logging: max 4 points (59% = 2.36 points). Combined total of 8 points for comprehensive logging strategy.',
        maxPoints: 8
      },
      {
        id: '8.4',
        name: 'Standardize Time Synchronization',
        description: 'Standardize time synchronization. Configure at least two synchronized time sources across enterprise assets, where supported.',
        ipFabricContext: 'NTP configured and synchronized',
        ipFabricInfo: 'NTP sources and synchronization state per device. Time underpins all local and remote logging including many aspects of system and organization wide automation and functionality.',
        apiEndpoint: '/tables/management/ntp/summary',
        guiPath: 'Technology/Management/NTP',
        target: '100%',
        targetInterpretation: 'Time synchronization is critical for correlating events across systems and accurate audit trails.',
        scoringRationale: 'Max 2 points based on percentage (65% = 1.3 points). Not all devices will have explicit or readable NTP configurations (possibly internal).',
        maxPoints: 2
      }
    ]
  },

  '12': {
    controlId: '12',
    name: 'Network Infrastructure Management',
    description: 'Establish, implement, and actively manage (track, report, correct) network devices, in order to prevent attackers from exploiting vulnerable network services and access points.',
    implementationGroup: 'IG1',
    applicableToNetworkInfrastructure: true,
    safeguards: [
      {
        id: '12.1',
        name: 'Ensure Network Infrastructure is Up-to-Date',
        description: 'Ensure network infrastructure is up-to-date. Example implementations include having devices on supported operating systems, and ensuring that all firmware is within the latest stable release.',
        ipFabricContext: 'Lifecycle Management (End of *)',
        ipFabricInfo: 'Reports on End of Life milestones, tracking devices running End of Support software.',
        apiEndpoint: '/tables/reports/eof/summary',
        guiPath: 'Inventory/End of Life Milestones',
        target: '0%',
        targetInterpretation: 'Zero EoS devices demonstrates current, supported infrastructure.',
        scoringRationale: 'Use 100 minus the latest snapshot percent to calculate a score with a max 2 points (so 2% EoS = 98% of 2 = 1.96 points).',
        maxPoints: 2,
        reversePolarity: true
      },
      {
        id: '12.2',
        name: 'Establish and Maintain a Secure Network Architecture',
        description: 'Establish and maintain a secure network architecture. A secure network architecture must address segmentation, least privilege, and availability, at a minimum.',
        ipFabricContext: 'Zone Firewall Policies configured in the network',
        ipFabricInfo: 'Enumerates all zone based firewall policies configured including default action. Indicates network segmentation and defense-in-depth implementation.',
        apiEndpoint: '/tables/security/zone-firewall/policies',
        guiPath: 'Technology/Security/Zone Firewall',
        target: 'Delta ≥ 0',
        targetInterpretation: 'Stable or increasing policy counts indicate maintained or enhanced network segmentation. More is not always better but is an indicator of enforcement and granularity.',
        scoringRationale: 'Delta < 0 results in score 0, else Delta ≥ 0 gets full score of 2 points. This is about growth and specificity increasing.',
        maxPoints: 2
      },
      {
        id: '12.3',
        name: 'Securely Manage Network Infrastructure',
        description: 'Securely manage network infrastructure. Example implementations include version-controlled infrastructure-as-code, and accessing network infrastructure over secure management protocols.',
        ipFabricContext: 'Clear text telnet protocol enabled',
        ipFabricInfo: 'Enumerates managed devices where telnet protocol is enabled.',
        apiEndpoint: '/tables/security/enabled-telnet',
        guiPath: 'Technology/Management/Telnet access',
        target: '0%',
        targetInterpretation: 'Secure management protocols (SSH) should replace telnet.',
        scoringRationale: 'Max score of 2 points (3% telnet = 97% of 2 = 1.94 points).',
        maxPoints: 2,
        reversePolarity: true
      },
      {
        id: '12.4',
        name: 'Establish and Maintain Architecture Diagram(s)',
        description: 'Establish and maintain an architecture diagram of the enterprise network that documents where sensitive data is stored, processed, and transmitted.',
        ipFabricContext: 'Generates site diagrams and low level design documentation',
        ipFabricInfo: 'Network viewer shows dynamic diagrams for up to date documentation (SVG, PNG, VSDX), as does LLD (Low Level Design) exports in DOCX.',
        apiEndpoint: '/tables/inventory/sites and /graphs/png',
        guiPath: 'Inventory/Sites',
        target: 'N/A',
        targetInterpretation: 'IP Fabric automatically generates and maintains network diagrams, eliminating manual documentation burden.',
        scoringRationale: 'As long as we get > 0 sites then we are contextualizing inventory for diagramming, so a full score of 2 points (otherwise 0).',
        maxPoints: 2
      },
      {
        id: '12.5',
        name: 'Centralize Network Authentication, Authorization, and Auditing (AAA)',
        description: 'Centralize network AAA. Enforce multi-factor authentication (MFA) for all network device access, including routers, switches, and other infrastructure.',
        ipFabricContext: 'TACACS and RADIUS servers configured on device (excl. cloud)',
        ipFabricInfo: 'Shows configured credential management configurations across network devices.',
        apiEndpoint: '/tables/security/aaa/authentication',
        guiPath: 'Management/AAA/Servers',
        target: 'Delta ≥ 0',
        targetInterpretation: 'Centralized AAA is critical for network security and audit trails.',
        scoringRationale: 'Max 2 points based on percentage (40% = 0.8 points). Only traditional route/switch infrastructure supports this, but it is extremely important.',
        maxPoints: 2
      }
    ]
  },

  '13': {
    controlId: '13',
    name: 'Network Monitoring and Defense',
    description: 'Operate processes and tooling to establish and maintain comprehensive network monitoring and defense against security threats across the enterprise\'s network infrastructure and user base.',
    implementationGroup: 'IG1',
    applicableToNetworkInfrastructure: true,
    safeguards: [
      {
        id: '13.4',
        name: 'Perform Traffic Filtering Between Network Segments',
        description: 'Perform traffic filtering between network segments, where appropriate. Example implementations include stateful inspection firewalls between network segments.',
        ipFabricContext: 'Zone Firewall Policies & ACL policies that permit ANY/ANY',
        ipFabricInfo: 'Enumerates all zone based firewall policies and detects overly promiscuous rulesets.',
        apiEndpoint: '/tables/security/zone-firewall/policies and /tables/security/acl',
        guiPath: 'Technology/Security',
        target: 'Firewall policies: Delta ≥ 0; ANY/ANY rules: Delta ≤ 0',
        targetInterpretation: 'Increasing segmentation and decreasing promiscuous rules demonstrates defense-in-depth strategy.',
        scoringRationale: 'Zone firewall: max 2 points if Delta ≥ 0. ANY/ANY rules: max 2 points (subtract value from 20 and divide by 10, capped at 0 if ≥20).',
        maxPoints: 4
      },
      {
        id: '13.6',
        name: 'Collect Network Traffic Flow Logs',
        description: 'Collect network traffic flow logs and/or network traffic to review and alert upon from network devices.',
        ipFabricContext: 'NetFlow / IPFIX flow data exports configured',
        ipFabricInfo: 'Summary inventory of devices participating in either NetFlow or sFlow collection. Flow data provides visibility into network traffic patterns and anomalies.',
        apiEndpoint: '/tables/management/flow/overview',
        guiPath: 'Technology/Management/Flow',
        target: 'Delta ≥ 0',
        targetInterpretation: 'Flow collection should expand to cover critical network segments. Not all devices support IPFIX (or NetFlow/sFlow) and doubling up on FLOW collection is non-optimal.',
        scoringRationale: 'Default max 4 points if flows are being gathered from >0 devices and Delta is ≥ 0. Score of 2 if flows gathered but Delta < 0.',
        maxPoints: 4
      },
      {
        id: '13.9',
        name: 'Deploy Port-Level Access Control',
        description: 'Deploy port-level access control. Port-level access control utilizes 802.1x, or similar network access control protocols, such as certificates, and may incorporate user and/or device authentication.',
        ipFabricContext: 'All 802.1x enabled network (not user) devices in the network',
        ipFabricInfo: 'Information about all devices and ports running 802.1X across sites. Port-level security provides an additional defense layer.',
        apiEndpoint: '/tables/security/secure-ports/devices',
        guiPath: 'Technology/Security/Secure ports - 802.1x',
        target: '100%',
        targetInterpretation: '802.1X deployment indicates zero-trust network access controls.',
        scoringRationale: 'Max 2 points based on percentage (40% = 0.8 points).',
        maxPoints: 2
      }
    ]
  },

  '17': {
    controlId: '17',
    name: 'Incident Response Management',
    description: 'Establish a program to develop and maintain an incident response capability (e.g., policies, plans, procedures, defined roles, training, and communications) to prepare, detect, and quickly respond to an attack.',
    implementationGroup: 'IG1',
    applicableToNetworkInfrastructure: true,
    safeguards: [
      {
        id: '17.9',
        name: 'Establish and Maintain Security Incident Thresholds',
        description: 'Establish and maintain security incident thresholds. Example implementations can include tuning security operations center (SOC) alert definitions and thresholds based on observed normal activity.',
        ipFabricContext: 'Number of IPv4 Routes, IPv4 Route Stability, Interfaces',
        ipFabricInfo: 'Reachability is paramount for IP networks. By checking aggregate route tables and route stability, we can detect incidents. Interface err-disabled states indicate security or configuration issues.',
        apiEndpoint: '/tables/networks/routes, /tables/networks/route-stability, /tables/inventory/interfaces',
        guiPath: 'Technology/Routing/IPv4 Routes',
        target: 'Routes: Delta ≥ 0; Route instability: 0; Err-disabled: 0%',
        targetInterpretation: 'Stable routing and healthy interfaces indicate normal operations. Deviations may indicate incidents.',
        scoringRationale: 'Routes Delta ≥ 0: 4 points. Route instability = 0: 2 points. Err-disabled: 100 minus percent × 4 (max 4 points). Total: 10 points for comprehensive incident detection.',
        maxPoints: 10
      }
    ]
  },

  '18': {
    controlId: '18',
    name: 'Penetration Testing',
    description: 'Test the effectiveness and resiliency of enterprise assets through identifying and exploiting weaknesses in controls (people, processes, and technology), and simulating the objectives and actions of an attacker.',
    implementationGroup: 'IG2',
    applicableToNetworkInfrastructure: true,
    safeguards: [
      {
        id: '18.4',
        name: 'Validate Security Measures',
        description: 'Validate security measures after each penetration test. If deemed necessary, modify rulesets and capabilities to detect the techniques used by testers.',
        ipFabricContext: 'Zone Firewall Policies & ACL policies that permit ANY/ANY',
        ipFabricInfo: 'Enumerates all zone based firewall policies and detects overly promiscuous rulesets that could be attack vectors.',
        apiEndpoint: '/tables/security/zone-firewall/policies and /tables/security/acl',
        guiPath: 'Technology/Security',
        target: 'Firewall policies: Delta ≥ 0; ANY/ANY rules: Delta ≤ 0',
        targetInterpretation: 'Security policies should be regularly validated and refined based on testing results.',
        scoringRationale: 'Zone firewall: max 5 points if Delta ≥ 0. ANY/ANY rules: max 5 points if 0, otherwise (20-value)/4 capped at 0.',
        maxPoints: 10
      }
    ]
  }
}

/**
 * Get control description by ID
 */
export function getControlDescription(controlId: string): ControlDescription | undefined {
  return CIS_CONTROL_DESCRIPTIONS[controlId]
}

/**
 * Get all control descriptions
 */
export function getAllControlDescriptions(): ControlDescription[] {
  return Object.values(CIS_CONTROL_DESCRIPTIONS)
}

/**
 * Get safeguard description by control ID and safeguard ID
 */
export function getSafeguardDescription(controlId: string, safeguardId: string): SafeguardDescription | undefined {
  const control = CIS_CONTROL_DESCRIPTIONS[controlId]
  return control?.safeguards.find(s => s.id === safeguardId)
}
