/**
 * Centralized configuration for all compliance frameworks
 * Add new frameworks by extending this configuration
 */

export interface ImplementationLevel {
  id: string
  name: string
  shortName: string
  description: string
  color: string // Tailwind color class
}

export interface FrameworkInfo {
  id: string
  name: string
  version?: string
  title: string
  description: string
  introduction: string
  totalControls: number
  totalSafeguards?: number
  maxScore: number
  implementationLevels?: ImplementationLevel[]
  distinctions?: {
    title: string
    description: string
    thisFramework: {
      title: string
      points: string[]
    }
    relatedFramework?: {
      title: string
      points: string[]
    }
  }
  interpretationGuide: {
    scoring?: {
      title: string
      description: string
    }
    statusIndicators: {
      title: string
      items: Array<{
        label: string
        color: string
        description: string
      }>
    }
    deltaInterpretation: {
      title: string
      description: string
      examples: Array<{
        metric: string
        trend: 'positive' | 'negative' | 'neutral'
        description: string
      }>
    }
  }
  notes?: string[]
  documentationUrl?: string
}

export const COMPLIANCE_FRAMEWORKS: Record<string, FrameworkInfo> = {
  'cis-v8': {
    id: 'cis-v8',
    name: 'CIS Controls',
    version: 'v8.1',
    title: 'Network Compliance Dashboard',
    description: 'This dashboard provides an overview of your IT network adherence to specific, relevant parts of the CIS Controls v8.1 that reference IT network assets and data flows. It is not a comprehensive assessment of overall organizational compliance.',
    introduction: 'The **CIS Controls** are a prioritized, prescriptive set of cybersecurity best practices designed to help organizations defend against the most common and impactful threats. The framework is structured around **18 critical controls**, each targeting a key area of security such as asset management, access control, incident response, penetration testing, and other defensive practices or processes.',
    totalControls: 18,
    totalSafeguards: 153,
    maxScore: 110,
    implementationLevels: [
      {
        id: 'ig1',
        name: 'Implementation Group 1',
        shortName: 'IG1',
        description: 'Considered the "minimum standard" of information security and should be implementable with minimal expertise and commercial off-the-shelf products.',
        color: 'green'
      },
      {
        id: 'ig2',
        name: 'Implementation Group 2',
        shortName: 'IG2',
        description: 'For organizations that manage more complex IT environments and usually have staff dedicated to security and IT.',
        color: 'yellow'
      },
      {
        id: 'ig3',
        name: 'Implementation Group 3',
        shortName: 'IG3',
        description: 'Requires advanced security expertise and capabilities to defend against sophisticated, targeted attacks (including zero-day threats).',
        color: 'red'
      }
    ],
    distinctions: {
      title: 'CIS Controls vs. CIS Benchmarks',
      description: 'This dashboard focuses entirely on **CIS Controls** to evaluate the maturity and coverage of your cybersecurity management and defensive practices. It does **not** use or depend on the specific system configurations addressed by **CIS Benchmarks**.',
      thisFramework: {
        title: 'CIS Controls (This Dashboard)',
        points: [
          'High-level, prioritized best practices',
          'Overall cybersecurity posture',
          'Entire IT system/network',
          'Broad safeguards and management measures'
        ]
      },
      relatedFramework: {
        title: 'CIS Benchmarks',
        points: [
          'Detailed, technology-specific configuration',
          'Secure configuration guidelines',
          'Individual systems and products',
          'Concrete settings for OS, databases, etc.'
        ]
      }
    },
    interpretationGuide: {
      scoring: {
        title: 'Overall Score & Grade',
        description: 'Helps demonstrate your organization\'s compliance level out of a maximum of 110 points (11 relevant controls × 10 points each). Each control is weighted equally and contributes specific safeguards.'
      },
      statusIndicators: {
        title: 'Control Status',
        items: [
          {
            label: 'Green (Pass)',
            color: 'green',
            description: 'Control is well implemented'
          },
          {
            label: 'Amber (Warning)',
            color: 'yellow',
            description: 'Partial implementation, needs attention'
          },
          {
            label: 'Red (Fail)',
            color: 'red',
            description: 'No data available or critical issue'
          }
        ]
      },
      deltaInterpretation: {
        title: 'Interpreting Deltas (Changes Between Snapshots)',
        description: 'IT infrastructure is not static. Understanding context is critical:',
        examples: [
          {
            metric: 'Increasing devices/sites',
            trend: 'positive',
            description: 'Generally positive (better visibility, growth)'
          },
          {
            metric: 'Increasing security policies',
            trend: 'positive',
            description: 'Positive (more granular controls)'
          },
          {
            metric: 'Decreasing errors/issues',
            trend: 'positive',
            description: 'Positive (improvements made)'
          },
          {
            metric: 'Decreasing devices unexpectedly',
            trend: 'negative',
            description: 'Warning (potential loss of visibility)'
          },
          {
            metric: 'Increasing clear-text protocols',
            trend: 'negative',
            description: 'Negative (security regression)'
          }
        ]
      }
    },
    notes: [
      'This dashboard assesses network infrastructure compliance using IP Fabric\'s automated discovery and analysis.',
      'It covers approximately **29 of 153 safeguards** that are relevant to network infrastructure.',
      'Many safeguards are process or application-related and cannot be automatically assessed.'
    ],
    documentationUrl: 'https://www.cisecurity.org/controls/v8'
  },

  'pci-dss': {
    id: 'pci-dss',
    name: 'PCI DSS',
    version: 'v4.0.1',
    title: 'PCI DSS v4.0.1 - Rapid Gap Analysis',
    description: 'This automatically generated report delivers a rapid, data-driven gap analysis of your network security posture against the Payment Card Industry Data Security Standard (PCI DSS) v4.0.1. It focuses on network infrastructure controls where IP Fabric provides comprehensive visibility and automated validation.',
    introduction: 'The **Payment Card Industry Data Security Standard (PCI DSS)** is a comprehensive set of security requirements designed to protect cardholder data and ensure secure payment card transactions. PCI DSS v4.0.1, which became mandatory on **March 31, 2025**, represents the latest evolution of the standard with enhanced focus on flexibility, security, and customized implementation approaches.\n\nThe framework is structured around **6 control objectives** and **12 principal requirements**, with over 300 sub-requirements that define concrete actions organizations must implement to protect Cardholder Data Environments (CDE).',
    totalControls: 6,
    totalSafeguards: 31,
    maxScore: 155,
    distinctions: {
      title: 'Network Infrastructure Focus',
      description: 'This gap analysis focuses on **network infrastructure controls** where IP Fabric provides comprehensive visibility and automated validation. While PCI DSS includes requirements related to application security, physical security, and organizational policies (Requirements 3-5, 9), this automated analysis focuses on network infrastructure controls that can be validated through IP Fabric\'s network discovery and assurance capabilities.',
      thisFramework: {
        title: 'Automated Network Assessment (This Dashboard)',
        points: [
          'Network security controls (firewalls, ACLs)',
          'Secure system configurations',
          'Access control and authentication',
          'Logging and monitoring infrastructure',
          'Automated evidence collection'
        ]
      },
      relatedFramework: {
        title: 'Full PCI DSS Compliance',
        points: [
          'Application security and data protection',
          'Physical security controls',
          'Organizational policies and procedures',
          'Security awareness training',
          'Incident response planning'
        ]
      }
    },
    interpretationGuide: {
      scoring: {
        title: 'Scoring Methodology',
        description: 'This assessment focuses on 6 of the 12 PCI DSS requirements where IP Fabric provides strong network visibility, with points distributed across network infrastructure controls. Total maximum: 155 points.\n\n**Point Distribution:**\n- Requirement 1: Network Security Controls (55 points)\n- Requirement 2: Secure Configurations (35 points)\n- Requirement 6: Secure Systems (5 points)\n- Requirement 7: Access Restrictions (5 points)\n- Requirement 8: User Authentication (15 points)\n- Requirement 10: Logging & Monitoring (15 points)\n- Requirement 11: Security Testing (5 points)\n- Requirement 12: Policy Support (20 points)'
      },
      statusIndicators: {
        title: 'RAG Status Indicators',
        items: [
          {
            label: 'Green',
            color: 'green',
            description: 'Target met, trending favorably - requirement satisfied'
          },
          {
            label: 'Amber',
            color: 'yellow',
            description: 'Target missed or needs attention - partial compliance'
          },
          {
            label: 'Red',
            color: 'red',
            description: 'No data available, error, or critical gap - non-compliant'
          }
        ]
      },
      deltaInterpretation: {
        title: 'Interpreting Deltas (Snapshot Comparison)',
        description: 'PCI DSS uses delta analysis to track security posture changes over time. RAG colors indicate whether changes trend toward or away from compliance:',
        examples: [
          {
            metric: 'Security policies (ACLs, Firewalls)',
            trend: 'positive',
            description: 'Green if Delta ≥ 0 (increased or maintained granularity)'
          },
          {
            metric: 'Insecure protocols (Telnet)',
            trend: 'positive',
            description: 'Green if decreasing toward 0%'
          },
          {
            metric: 'ANY/ANY rules',
            trend: 'positive',
            description: 'Green if Delta ≤ 0 (eliminating overly permissive rules)'
          },
          {
            metric: 'Logging and NTP',
            trend: 'positive',
            description: 'Green if increasing toward 100%'
          },
          {
            metric: 'End of Support devices',
            trend: 'negative',
            description: 'Amber/Red if percentage increases (more vulnerable devices)'
          }
        ]
      }
    },
    notes: [
      'This assessment evaluates 6 of 12 PCI DSS requirements focused on network infrastructure.',
      'Scoring uses percentage calculations, delta analysis, and threshold comparisons.',
      'Points are distributed across checks within each requirement.',
      'Many scores are calibrated to demonstrate IP Fabric features and applicability.',
      'This automated approach can be enhanced by IP Fabric\'s programmable extensions.'
    ],
    documentationUrl: 'https://www.pcisecuritystandards.org/document_library/'
  },

  'dora': {
    id: 'dora',
    name: 'DORA',
    version: 'EU Regulation 2022/2554',
    title: 'DORA Compliance Dashboard',
    description: 'Track compliance with Digital Operational Resilience Act requirements for ICT risk management and operational resilience.',
    introduction: 'The **Digital Operational Resilience Act (DORA)** establishes a regulatory framework for digital operational resilience in the EU financial sector, focusing on ICT risk management, incident reporting, and third-party risk management.',
    totalControls: 5,
    maxScore: 50,
    interpretationGuide: {
      statusIndicators: {
        title: 'Compliance Status',
        items: [
          {
            label: 'Compliant',
            color: 'green',
            description: 'Requirements met'
          },
          {
            label: 'In Progress',
            color: 'yellow',
            description: 'Implementation ongoing'
          },
          {
            label: 'Non-Compliant',
            color: 'red',
            description: 'Requires immediate attention'
          }
        ]
      },
      deltaInterpretation: {
        title: 'Resilience Monitoring',
        description: 'DORA emphasizes continuous improvement of operational resilience:',
        examples: []
      }
    },
    notes: [
      'DORA applies to financial entities and ICT third-party service providers.',
      'This dashboard assesses network infrastructure resilience and monitoring capabilities.',
      'Full compliance requires governance, testing, and incident response procedures.'
    ]
  },

  'nist': {
    id: 'nist',
    name: 'NIST Cybersecurity Framework',
    version: 'v2.0',
    title: 'NIST Cybersecurity Framework Dashboard',
    description: 'Assess your network alignment with NIST Cybersecurity Framework controls for identifying, protecting, detecting, responding, and recovering from cyber threats.',
    introduction: 'The **NIST Cybersecurity Framework** provides a policy framework of computer security guidance for how organizations can assess and improve their ability to prevent, detect, and respond to cyber attacks.',
    totalControls: 23,
    maxScore: 230,
    interpretationGuide: {
      statusIndicators: {
        title: 'Function Maturity',
        items: [
          {
            label: 'Optimized',
            color: 'green',
            description: 'Advanced implementation with continuous improvement'
          },
          {
            label: 'Managed',
            color: 'yellow',
            description: 'Defined and actively managed'
          },
          {
            label: 'Initial',
            color: 'red',
            description: 'Ad-hoc or non-existent'
          }
        ]
      },
      deltaInterpretation: {
        title: 'Maturity Progression',
        description: 'NIST focuses on progressive maturity across five functions:',
        examples: []
      }
    },
    notes: [
      'NIST CSF is voluntary and widely adopted across industries.',
      'Framework organizes cybersecurity activities into Identify, Protect, Detect, Respond, and Recover.',
      'This dashboard focuses on network infrastructure aspects of each function.'
    ]
  },
  'nis2': {
    id: 'nis2',
    name: 'NIS2 Directive',
    version: 'EU 2022/2555',
    title: 'NIS2 Directive Compliance Dashboard',
    description: 'Monitor network security measures required under the EU Network and Information Security Directive (NIS2) for essential and important entities.',
    introduction: 'The **NIS2 Directive** (DIRECTIVE (EU) 2022/2555) updates and supersedes the previous NIS Directive on the security of network and information systems. It includes an extended scope, stricter security requirements, and board-level accountability. Its far-reaching scope applies to entities operating in the EU and those supplying services to EU-based entities, including some third parties. Strengthened supervision and enforcement mean significantly increased fines of up to **10 million euros or 2% of total worldwide turnover** (whichever is higher) for in-scope essential entities.',
    totalControls: 8,
    maxScore: 200,
    distinctions: {
      title: 'Network Infrastructure Focus',
      description: 'This gap analysis focuses on **network infrastructure controls** where IP Fabric provides unsurpassed visibility and automated validation. While NIS2 includes requirements related to policy, procedures, law, cooperation, coordinated frameworks, and strategies, this automated analysis focuses on network infrastructure controls and cybersecurity capabilities that can be verified through IP Fabric\'s network discovery and assurance capabilities.',
      thisFramework: {
        title: 'Automated Network Assessment (This Dashboard)',
        points: [
          'Incident handling infrastructure (inventory, logging, NTP)',
          'Business continuity evidence (discovery, configuration management)',
          'Supply chain security controls (ACLs, firewalls, BGP)',
          'Vulnerability handling (End of Support lifecycle)',
          'Risk management effectiveness (AAA, telnet, ANY/ANY policies)',
          'Cryptography controls (telnet elimination, 802.1X)',
          'Access control and asset management',
          'Entity IP range registration evidence (routing tables)'
        ]
      },
      relatedFramework: {
        title: 'Full NIS2 Compliance',
        points: [
          'Governance and board-level accountability',
          'Coordinated vulnerability disclosure',
          'Incident reporting obligations (24h/72h)',
          'Supply chain contractual security',
          'Human resources security policies',
          'Crisis management procedures',
          'Cross-border cooperation frameworks'
        ]
      }
    },
    interpretationGuide: {
      scoring: {
        title: 'Scoring Methodology',
        description: 'This assessment focuses on 2 Chapters and 2 Articles of NIS2 where IP Fabric provides strong evidence and visibility. Total maximum: 200 points.\n\n**Point Distribution:**\n- Chapter IV, Article 21 - Cybersecurity Risk-management Measures (185 points):\n  - 21.2.B: Incident Handling (60 points, 12 checks)\n  - 21.2.C: Business Continuity (25 points, 5 checks)\n  - 21.2.D: Supply Chain Security (20 points, 4 checks)\n  - 21.2.E: Vulnerability Handling (5 points, 1 check)\n  - 21.2.F: Risk Management Assessment (30 points, 6 checks)\n  - 21.2.H: Cryptography & Encryption (10 points, 2 checks)\n  - 21.2.I: Access Control & Asset Management (35 points, 7 checks)\n- Chapter V, Article 27 - Registry of Entities (15 points):\n  - 27.2.F: Entity IP Ranges (15 points, 3 checks)\n\nScoring uses percentage calculations, delta analysis, and threshold comparisons. Points are distributed as multiples of 5 across checks.'
      },
      statusIndicators: {
        title: 'RAG Status Indicators',
        items: [
          {
            label: 'Green',
            color: 'green',
            description: 'Target met, trending favourably - requirement satisfied'
          },
          {
            label: 'Amber',
            color: 'yellow',
            description: 'Target missed or needs attention - partial compliance'
          },
          {
            label: 'Red',
            color: 'red',
            description: 'No data available, error, or critical gap - non-compliant'
          }
        ]
      },
      deltaInterpretation: {
        title: 'Interpreting Deltas (Snapshot Comparison)',
        description: 'NIS2 uses delta analysis to track security posture changes between network snapshots. RAG colours indicate whether changes trend toward or away from compliance:',
        examples: [
          {
            metric: 'Security policies (ACLs, Firewalls)',
            trend: 'positive' as const,
            description: 'Green if Delta ≥ 0 (maintained or increased granularity)'
          },
          {
            metric: 'Insecure protocols (Telnet)',
            trend: 'positive' as const,
            description: 'Green if decreasing toward 0%'
          },
          {
            metric: 'ANY/ANY rules',
            trend: 'positive' as const,
            description: 'Green if Delta ≤ 0 (eliminating overly permissive rules)'
          },
          {
            metric: 'Logging and NTP coverage',
            trend: 'positive' as const,
            description: 'Green if increasing toward 100%'
          },
          {
            metric: 'End of Support devices',
            trend: 'negative' as const,
            description: 'Amber/Red if percentage increases (more vulnerable devices)'
          },
          {
            metric: 'eBGP Neighbours',
            trend: 'positive' as const,
            description: 'Green if count is stable or decreasing'
          }
        ]
      }
    },
    notes: [
      'This assessment evaluates network infrastructure evidence for NIS2 Articles 21 and 27.',
      'NIS2 applies to essential and important entities operating in or serving the EU.',
      'Scores intentionally do not normalise to 100 points to avoid implying full organisational compliance.',
      'Many checks reuse the same API data across multiple articles (e.g., ACLs appear in 21.2.B, 21.2.D, 21.2.F, and 21.2.I).',
      'Delta scoring requires two snapshots for accurate comparative analysis.',
      'This automated approach can be enhanced by IP Fabric\'s programmable extensions.'
    ],
    documentationUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022L2555'
  }
}

/**
 * Helper function to get framework configuration
 */
export function getFrameworkConfig(frameworkId: string): FrameworkInfo {
  return COMPLIANCE_FRAMEWORKS[frameworkId] || COMPLIANCE_FRAMEWORKS['cis-v8']
}

/**
 * Helper function to get all available frameworks
 */
export function getAllFrameworks(): FrameworkInfo[] {
  return Object.values(COMPLIANCE_FRAMEWORKS)
}
