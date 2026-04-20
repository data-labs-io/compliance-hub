/**
 * NIS2 Directive Calculator Unit Tests
 *
 * Tests the scoring logic for all 8 NIS2 articles:
 * - 21.2.B: Incident Handling (60 points, 12 checks)
 * - 21.2.C: Business Continuity (25 points, 5 checks)
 * - 21.2.D: Supply Chain Security (20 points, 4 checks)
 * - 21.2.E: Vulnerability Handling (5 points, 1 check)
 * - 21.2.F: Risk Management Assessment (30 points, 6 checks)
 * - 21.2.H: Cryptography & Encryption (10 points, 2 checks)
 * - 21.2.I: Access Control & Asset Management (35 points, 7 checks)
 * - 27.2.F: Entity IP Ranges (15 points, 3 checks)
 */

import { describe, it, expect } from 'vitest'
import {
  calculateOverallNIS2Score,
  recalculateArticlesWithMetrics,
  extractMetricsFromArticles
} from './calculator'
import type { NIS2Metrics, NIS2Article } from './types'

// =============================================================================
// TEST FIXTURES
// =============================================================================

const fullNIS2Metrics: NIS2Metrics = {
  totalDevices: 72,
  totalSites: 12,

  // Device inventory
  deviceCount: 72,
  deviceCountAvailable: true,

  // Sites
  siteCount: 12,
  siteCountAvailable: true,

  // NTP
  ntpPercent: 65,
  ntpAvailable: true,

  // DNS
  ipv4DnsCoveragePercent: 84,
  ipv4DnsCoverageAvailable: true,
  dnsServersCount: 130,
  dnsServersAvailable: true,

  // Logging
  localLoggingPercent: 85,
  localLoggingAvailable: true,
  remoteLoggingPercent: 59,
  remoteLoggingAvailable: true,

  // Configuration
  configurationCount: 167,
  configurationCountAvailable: true,

  // Security policies
  aclPolicyCount: 17,
  aclPolicyCountAvailable: true,
  zoneFwPolicyCount: 250,
  zoneFwPolicyCountAvailable: true,

  // BGP
  ebgpNeighborsCount: 12,
  ebgpNeighborsAvailable: true,

  // Diagrams
  diagramAvailable: true,

  // Discovery
  discoveryIssues: 2,
  discoveryIssuesAvailable: true,

  // Platforms
  uniquePlatforms: 15,
  uniquePlatformsAvailable: true,

  // End of Support
  endOfSupportPercent: 2,
  endOfSupportAvailable: true,

  // AAA
  aaaPercent: 40,
  aaaAvailable: true,

  // Telnet
  telnetPercent: 3,
  telnetAvailable: true,

  // ANY/ANY
  anyAnyAclCount: 17,
  anyAnyAclAvailable: true,
  anyAnyFwCount: 5,
  anyAnyFwAvailable: true,

  // 802.1x
  securePortsPercent: 40,
  securePortsAvailable: true,

  // Routes
  ipv4RoutesCount: 1557,
  ipv4RoutesAvailable: true,
  ipv6RoutesCount: 189,
  ipv6RoutesAvailable: true,

  // Previous metrics for delta calculations
  previousMetrics: {
    totalDevices: 93,
    siteCount: 14,
    ntpPercent: 63,
    ipv4DnsCoveragePercent: 86,
    dnsServersCount: 125,
    localLoggingPercent: 82,
    remoteLoggingPercent: 59,
    configurationCount: 167,
    aclPolicyCount: 18,
    zoneFwPolicyCount: 253,
    ebgpNeighborsCount: 12,
    discoveryIssues: 5,
    endOfSupportPercent: 1,
    aaaPercent: 47,
    telnetPercent: 4,
    anyAnyAclCount: 18,
    anyAnyFwCount: 6,
    securePortsPercent: 32,
    ipv4RoutesCount: 2367,
    ipv6RoutesCount: 145,
    uniquePlatforms: 15
  }
}

const minimalNIS2Metrics: NIS2Metrics = {
  totalDevices: 5,
  totalSites: 1,
  deviceCount: 5,
  deviceCountAvailable: true,
  siteCount: null,
  siteCountAvailable: false,
  ntpPercent: null,
  ntpAvailable: false,
  ipv4DnsCoveragePercent: null,
  ipv4DnsCoverageAvailable: false,
  dnsServersCount: null,
  dnsServersAvailable: false,
  localLoggingPercent: null,
  localLoggingAvailable: false,
  remoteLoggingPercent: null,
  remoteLoggingAvailable: false,
  configurationCount: null,
  configurationCountAvailable: false,
  aclPolicyCount: null,
  aclPolicyCountAvailable: false,
  zoneFwPolicyCount: null,
  zoneFwPolicyCountAvailable: false,
  ebgpNeighborsCount: null,
  ebgpNeighborsAvailable: false,
  diagramAvailable: false,
  discoveryIssues: 0,
  discoveryIssuesAvailable: false,
  uniquePlatforms: null,
  uniquePlatformsAvailable: false,
  endOfSupportPercent: null,
  endOfSupportAvailable: false,
  aaaPercent: null,
  aaaAvailable: false,
  telnetPercent: null,
  telnetAvailable: false,
  anyAnyAclCount: null,
  anyAnyAclAvailable: false,
  anyAnyFwCount: null,
  anyAnyFwAvailable: false,
  securePortsPercent: null,
  securePortsAvailable: false,
  ipv4RoutesCount: null,
  ipv4RoutesAvailable: false,
  ipv6RoutesCount: null,
  ipv6RoutesAvailable: false
}

// =============================================================================
// OVERALL SCORE CALCULATION
// =============================================================================

describe('calculateOverallNIS2Score', () => {
  it('calculates correct percentage from articles', () => {
    const articles: NIS2Article[] = [
      { id: '21.2.B', name: 'Incident Handling', score: 42, maxScore: 60, status: 'pass', details: [] },
      { id: '21.2.C', name: 'Business Continuity', score: 20, maxScore: 25, status: 'pass', details: [] },
      { id: '27.2.F', name: 'Entity IP Ranges', score: 10, maxScore: 15, status: 'pass', details: [] }
    ]

    const result = calculateOverallNIS2Score(articles)
    // (42 + 20 + 10) / (60 + 25 + 15) * 100 = 72/100 * 100 = 72
    expect(result).toBeCloseTo(72, 0)
  })

  it('returns 100 when all articles have full score', () => {
    const articles: NIS2Article[] = [
      { id: '21.2.B', name: 'Test', score: 60, maxScore: 60, status: 'pass', details: [] },
      { id: '21.2.C', name: 'Test', score: 25, maxScore: 25, status: 'pass', details: [] },
      { id: '21.2.D', name: 'Test', score: 20, maxScore: 20, status: 'pass', details: [] },
      { id: '21.2.E', name: 'Test', score: 5, maxScore: 5, status: 'pass', details: [] },
      { id: '21.2.F', name: 'Test', score: 30, maxScore: 30, status: 'pass', details: [] },
      { id: '21.2.H', name: 'Test', score: 10, maxScore: 10, status: 'pass', details: [] },
      { id: '21.2.I', name: 'Test', score: 35, maxScore: 35, status: 'pass', details: [] },
      { id: '27.2.F', name: 'Test', score: 15, maxScore: 15, status: 'pass', details: [] }
    ]

    expect(calculateOverallNIS2Score(articles)).toBe(100)
  })

  it('returns 0 when all articles have zero score', () => {
    const articles: NIS2Article[] = [
      { id: '21.2.B', name: 'Test', score: 0, maxScore: 60, status: 'warning', details: [] },
      { id: '21.2.C', name: 'Test', score: 0, maxScore: 25, status: 'warning', details: [] },
      { id: '21.2.D', name: 'Test', score: 0, maxScore: 20, status: 'warning', details: [] },
      { id: '21.2.E', name: 'Test', score: 0, maxScore: 5, status: 'warning', details: [] },
      { id: '21.2.F', name: 'Test', score: 0, maxScore: 30, status: 'warning', details: [] },
      { id: '21.2.H', name: 'Test', score: 0, maxScore: 10, status: 'warning', details: [] },
      { id: '21.2.I', name: 'Test', score: 0, maxScore: 35, status: 'warning', details: [] },
      { id: '27.2.F', name: 'Test', score: 0, maxScore: 15, status: 'warning', details: [] }
    ]

    expect(calculateOverallNIS2Score(articles)).toBe(0)
  })
})

// =============================================================================
// ARTICLE SCORING WITH METRICS
// =============================================================================

describe('recalculateArticlesWithMetrics', () => {
  describe('generates all 8 articles', () => {
    it('returns array with all article IDs', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)

      const ids = result.map(a => a.id)
      expect(ids).toContain('21.2.B')
      expect(ids).toContain('21.2.C')
      expect(ids).toContain('21.2.D')
      expect(ids).toContain('21.2.E')
      expect(ids).toContain('21.2.F')
      expect(ids).toContain('21.2.H')
      expect(ids).toContain('21.2.I')
      expect(ids).toContain('27.2.F')
      expect(ids.length).toBe(8)
    })

    it('all articles have valid status', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)

      result.forEach(article => {
        expect(['pass', 'warning']).toContain(article.status)
      })
    })

    it('all article scores are within valid range', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)

      result.forEach(article => {
        expect(article.score).toBeGreaterThanOrEqual(0)
        expect(article.score).toBeLessThanOrEqual(article.maxScore)
      })
    })

    it('total max score is 200', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const totalMax = result.reduce((sum, a) => sum + a.maxScore, 0)
      expect(totalMax).toBe(200)
    })
  })

  describe('21.2.B: Incident Handling scoring', () => {
    it('has correct maxScore of 60', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.B')
      expect(article?.maxScore).toBe(60)
    })

    it('has 12 check details', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.B')
      expect(article?.details?.length).toBe(12)
    })

    it('awards full score for device presence', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.B')
      const detail = article?.details?.find(d => d.id === '21.2.B-devices')
      expect(detail?.calculatedPoints).toBe(5)
    })

    it('scores NTP as percentage × 5', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.B')
      const detail = article?.details?.find(d => d.id === '21.2.B-ntp')
      // 65% × 5 = 3.25
      expect(detail?.calculatedPoints).toBeCloseTo(3.25, 1)
    })

    it('awards full score for diagrams', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.B')
      const detail = article?.details?.find(d => d.id === '21.2.B-diagrams')
      expect(detail?.calculatedPoints).toBe(5)
    })
  })

  describe('21.2.C: Business Continuity scoring', () => {
    it('has correct maxScore of 25', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.C')
      expect(article?.maxScore).toBe(25)
    })

    it('uses tiered scoring for discovery issues', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.C')
      const detail = article?.details?.find(d => d.id === '21.2.C-discovery')
      // 2 issues (1-10 range) = 4 pts
      expect(detail?.calculatedPoints).toBe(4)
    })
  })

  describe('21.2.E: Vulnerability Handling scoring', () => {
    it('has correct maxScore of 5', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.E')
      expect(article?.maxScore).toBe(5)
    })

    it('uses inverse percentage for End of Support', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.E')
      const detail = article?.details?.find(d => d.id === '21.2.E-eos')
      // 2% EoS = (100-2)/100 × 5 = 4.9
      expect(detail?.calculatedPoints).toBeCloseTo(4.9, 1)
    })
  })

  describe('21.2.F: Risk Management Assessment scoring', () => {
    it('has correct maxScore of 30', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.F')
      expect(article?.maxScore).toBe(30)
    })

    it('uses inverse percentage for telnet', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.F')
      const detail = article?.details?.find(d => d.id === '21.2.F-telnet')
      // 3% telnet = (100-3)/100 × 5 = 4.85
      expect(detail?.calculatedPoints).toBeCloseTo(4.85, 1)
    })

    it('uses delta ≤ 0 for ANY/ANY ACL', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.F')
      const detail = article?.details?.find(d => d.id === '21.2.F-any-acl')
      // 17 current vs 18 previous = delta -1 ≤ 0 → full score
      expect(detail?.calculatedPoints).toBe(5)
    })
  })

  describe('21.2.H: Cryptography & Encryption scoring', () => {
    it('has correct maxScore of 10', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.H')
      expect(article?.maxScore).toBe(10)
    })

    it('scores 802.1X as percentage × 5', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '21.2.H')
      const detail = article?.details?.find(d => d.id === '21.2.H-8021x')
      // 40% × 5 = 2
      expect(detail?.calculatedPoints).toBe(2)
    })
  })

  describe('27.2.F: Entity IP Ranges scoring', () => {
    it('has correct maxScore of 15', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '27.2.F')
      expect(article?.maxScore).toBe(15)
    })

    it('awards full score for IPv4 routes presence', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '27.2.F')
      const detail = article?.details?.find(d => d.id === '27.2.F-ipv4routes')
      expect(detail?.calculatedPoints).toBe(5)
    })

    it('awards full score for IPv6 routes presence', () => {
      const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
      const article = result.find(a => a.id === '27.2.F')
      const detail = article?.details?.find(d => d.id === '27.2.F-ipv6routes')
      expect(detail?.calculatedPoints).toBe(5)
    })
  })
})

// =============================================================================
// UNAVAILABLE METRICS HANDLING
// =============================================================================

describe('handling unavailable metrics', () => {
  it('returns zero points for unavailable metrics', () => {
    const result = recalculateArticlesWithMetrics(minimalNIS2Metrics)

    // Only device inventory should score (5 pts in 21.2.B, 5 in 21.2.C, 5 in 21.2.I)
    const totalScore = result.reduce((sum, a) => sum + a.score, 0)
    expect(totalScore).toBeLessThan(30)
  })

  it('21.2.B scores only for available data', () => {
    const result = recalculateArticlesWithMetrics(minimalNIS2Metrics)
    const article = result.find(a => a.id === '21.2.B')

    // Only devices should score (5 pts); all others unavailable
    expect(article?.score).toBe(5)
  })

  it('21.2.E returns 0 when EoS data unavailable', () => {
    const result = recalculateArticlesWithMetrics(minimalNIS2Metrics)
    const article = result.find(a => a.id === '21.2.E')
    expect(article?.score).toBe(0)
  })

  it('27.2.F returns 0 when route data unavailable', () => {
    const result = recalculateArticlesWithMetrics(minimalNIS2Metrics)
    const article = result.find(a => a.id === '27.2.F')
    // discoveryIssues = 0 → 5pts (tiered), but discoveryIssuesAvailable is false
    // ipv4, ipv6 routes unavailable → 0 pts each
    expect(article?.score).toBe(0)
  })
})

// =============================================================================
// DELTA CALCULATIONS
// =============================================================================

describe('delta calculations', () => {
  it('calculates delta direction for NTP improvement', () => {
    const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
    const article = result.find(a => a.id === '21.2.B')
    const detail = article?.details?.find(d => d.id === '21.2.B-ntp')

    // 63% → 65% = positive
    expect(detail?.deltaDirection).toBe('positive')
  })

  it('calculates delta for DNS coverage decrease', () => {
    const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
    const article = result.find(a => a.id === '21.2.B')
    const detail = article?.details?.find(d => d.id === '21.2.B-dns-coverage')

    // 86% → 84% = negative
    expect(detail?.deltaDirection).toBe('negative')
  })

  it('calculates delta for ANY/ANY FW decrease (positive)', () => {
    const result = recalculateArticlesWithMetrics(fullNIS2Metrics)
    const article = result.find(a => a.id === '21.2.F')
    const detail = article?.details?.find(d => d.id === '21.2.F-any-fw')

    // 6 → 5 = decrease = positive for reverse polarity
    expect(detail?.deltaDirection).toBe('positive')
    expect(detail?.calculatedPoints).toBe(5)
  })

  it('handles missing previous metrics gracefully', () => {
    const metricsNoPrev = { ...fullNIS2Metrics }
    delete metricsNoPrev.previousMetrics

    const result = recalculateArticlesWithMetrics(metricsNoPrev)
    result.forEach(article => {
      expect(article.score).toBeGreaterThanOrEqual(0)
      expect(article.score).toBeLessThanOrEqual(article.maxScore)
    })
  })
})

// =============================================================================
// EXTRACT METRICS
// =============================================================================

describe('extractMetricsFromArticles', () => {
  it('returns metrics object with device and site counts', () => {
    const articles = recalculateArticlesWithMetrics(fullNIS2Metrics)
    const result = extractMetricsFromArticles(articles, 72, 12)

    expect(result.totalDevices).toBe(72)
    expect(result.totalSites).toBe(12)
  })
})
