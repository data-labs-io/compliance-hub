/**
 * NIST CSF v2.0 Calculator Unit Tests
 *
 * Tests the scoring logic for NIST CSF functions:
 * - GV: Govern - Risk management strategy
 * - ID: Identify - Asset understanding
 * - PR: Protect - Safeguards
 * - DE: Detect - Attack detection
 * - RS: Respond - Incident response
 * - RC: Recover - Asset restoration
 */

import { describe, it, expect } from 'vitest'
import {
  calculateOverallNISTCSFScore,
  recalculateFunctionsWithMetrics,
  extractMetricsFromFunctions
} from './calculator'
import type { NISTCSFMetrics, NISTCSFFunction } from './types'

// =============================================================================
// TEST FIXTURES
// =============================================================================

const mockDevices = [
  { id: '1', name: 'Device 1', vendor: 'Cisco', version: '17.6.1', site: 'HQ', issues: 0 },
  { id: '2', name: 'Device 2', vendor: 'Arista', version: '4.29.1', site: 'HQ', issues: 0 },
  { id: '3', name: 'Device 3', vendor: 'Cisco', version: '17.6.1', site: 'Branch', issues: 1 }
]

const fullNISTMetrics: NISTCSFMetrics = {
  totalDevices: 150,
  totalSites: 10,

  // GV metrics
  intentChecksPassed: 120,
  intentChecksFailed: 30,
  intentChecksTotal: 150,
  discoveryIssues: 5,
  discoveryIssuesAvailable: true,

  // ID metrics
  deviceCount: 150,
  deviceCountAvailable: true,
  siteCount: 10,
  siteCountAvailable: true,
  uniquePlatforms: 8,
  uniquePlatformsAvailable: true,
  versionVariance: 3,
  versionVarianceAvailable: true,
  versionVarianceFamily: 'Cisco IOS',
  ipv4DnsCoveragePercent: 85,
  ipv4DnsCoverageAvailable: true,
  ipv6ConfiguredPercent: 100,
  ipv6ConfiguredAvailable: true,
  pathLookupAvailable: true,

  // PR metrics
  aaaServersPercent: 75,
  aaaServersAvailable: true,
  localUsersPercent: 60,
  localUsersAvailable: true,
  endOfSupportPercent: 5,
  endOfSupportAvailable: true,
  localLoggingPercent: 90,
  localLoggingAvailable: true,

  // DE metrics
  errDisabledPercent: 2,
  errDisabledAvailable: true,
  unstableRoutesCount: 0,
  unstableRoutesAvailable: true,
  ebgpNeighborsCount: 12,
  ebgpNeighborsAvailable: true,
  remoteLoggingPercent: 70,
  remoteLoggingAvailable: true,

  // RS metrics
  anyAnyAclCount: 15,
  anyAnyAclAvailable: true,

  // RC metrics
  ipv4RoutesCount: 2500,
  ipv4RoutesAvailable: true,
  ipv6RoutesCount: 150,
  ipv6RoutesAvailable: false,
  configChangedCount: 0,
  configChangedAvailable: false,

  // Previous metrics for delta
  previousMetrics: {
    totalDevices: 145,
    discoveryIssues: 8,
    siteCount: 10,
    ipv4DnsCoveragePercent: 82,
    aaaServersPercent: 70,
    localLoggingPercent: 85,
    remoteLoggingPercent: 65,
    anyAnyAclCount: 18,
    ipv4RoutesCount: 2400
  }
}

const minimalNISTMetrics: NISTCSFMetrics = {
  totalDevices: 10,
  totalSites: 1,
  intentChecksPassed: 0,
  intentChecksFailed: 0,
  intentChecksTotal: 0,
  discoveryIssues: 50,
  discoveryIssuesAvailable: true,
  deviceCount: 10,
  deviceCountAvailable: true,
  siteCount: null,
  siteCountAvailable: false,
  uniquePlatforms: null,
  uniquePlatformsAvailable: false,
  versionVariance: null,
  versionVarianceAvailable: false,
  ipv4DnsCoveragePercent: null,
  ipv4DnsCoverageAvailable: false,
  ipv6ConfiguredPercent: null,
  ipv6ConfiguredAvailable: false,
  pathLookupAvailable: false,
  aaaServersPercent: null,
  aaaServersAvailable: false,
  localUsersPercent: null,
  localUsersAvailable: false,
  endOfSupportPercent: null,
  endOfSupportAvailable: false,
  localLoggingPercent: null,
  localLoggingAvailable: false,
  errDisabledPercent: null,
  errDisabledAvailable: false,
  unstableRoutesCount: null,
  unstableRoutesAvailable: false,
  ebgpNeighborsCount: null,
  ebgpNeighborsAvailable: false,
  remoteLoggingPercent: null,
  remoteLoggingAvailable: false,
  anyAnyAclCount: null,
  anyAnyAclAvailable: false,
  ipv4RoutesCount: null,
  ipv4RoutesAvailable: false,
  ipv6RoutesCount: null,
  ipv6RoutesAvailable: false,
  configChangedCount: null,
  configChangedAvailable: false
}

// =============================================================================
// OVERALL SCORE CALCULATION
// =============================================================================

describe('calculateOverallNISTCSFScore', () => {
  it('calculates correct percentage from functions', () => {
    const functions: NISTCSFFunction[] = [
      { id: 'GV', name: 'Govern', score: 4, maxScore: 5, status: 'pass', details: [] },
      { id: 'ID', name: 'Identify', score: 5, maxScore: 5, status: 'pass', details: [] },
      { id: 'PR', name: 'Protect', score: 4, maxScore: 5, status: 'pass', details: [] },
      { id: 'DE', name: 'Detect', score: 3, maxScore: 5, status: 'warning', details: [] },
      { id: 'RS', name: 'Respond', score: 4, maxScore: 5, status: 'pass', details: [] },
      { id: 'RC', name: 'Recover', score: 4, maxScore: 5, status: 'pass', details: [] }
    ]

    const result = calculateOverallNISTCSFScore(functions)

    // (4 + 5 + 4 + 3 + 4 + 4) / 30 * 100 = 24/30 * 100 = 80%
    expect(result).toBeCloseTo(80, 1)
  })

  it('returns NaN when no functions provided (edge case)', () => {
    const result = calculateOverallNISTCSFScore([])
    expect(Number.isNaN(result)).toBe(true)
  })

  it('returns 100 when all functions have full score', () => {
    const functions: NISTCSFFunction[] = [
      { id: 'GV', name: 'Govern', score: 5, maxScore: 5, status: 'pass', details: [] },
      { id: 'ID', name: 'Identify', score: 5, maxScore: 5, status: 'pass', details: [] },
      { id: 'PR', name: 'Protect', score: 5, maxScore: 5, status: 'pass', details: [] },
      { id: 'DE', name: 'Detect', score: 5, maxScore: 5, status: 'pass', details: [] },
      { id: 'RS', name: 'Respond', score: 5, maxScore: 5, status: 'pass', details: [] },
      { id: 'RC', name: 'Recover', score: 5, maxScore: 5, status: 'pass', details: [] }
    ]

    expect(calculateOverallNISTCSFScore(functions)).toBe(100)
  })

  it('returns 0 when all functions have zero score', () => {
    const functions: NISTCSFFunction[] = [
      { id: 'GV', name: 'Govern', score: 0, maxScore: 5, status: 'warning', details: [] },
      { id: 'ID', name: 'Identify', score: 0, maxScore: 5, status: 'warning', details: [] },
      { id: 'PR', name: 'Protect', score: 0, maxScore: 5, status: 'warning', details: [] },
      { id: 'DE', name: 'Detect', score: 0, maxScore: 5, status: 'warning', details: [] },
      { id: 'RS', name: 'Respond', score: 0, maxScore: 5, status: 'warning', details: [] },
      { id: 'RC', name: 'Recover', score: 0, maxScore: 5, status: 'warning', details: [] }
    ]

    expect(calculateOverallNISTCSFScore(functions)).toBe(0)
  })
})

// =============================================================================
// FUNCTION SCORING WITH METRICS
// =============================================================================

describe('recalculateFunctionsWithMetrics', () => {
  describe('generates expected functions', () => {
    it('returns array with all 6 function IDs', () => {
      const result = recalculateFunctionsWithMetrics(fullNISTMetrics)

      const ids = result.map(f => f.id)
      expect(ids).toContain('GV')
      expect(ids).toContain('ID')
      expect(ids).toContain('PR')
      expect(ids).toContain('DE')
      expect(ids).toContain('RS')
      expect(ids).toContain('RC')
      expect(ids.length).toBe(6)
    })

    it('all functions have valid status', () => {
      const result = recalculateFunctionsWithMetrics(fullNISTMetrics)

      result.forEach(func => {
        expect(['pass', 'warning']).toContain(func.status)
      })
    })

    it('all functions have maxScore of 5', () => {
      const result = recalculateFunctionsWithMetrics(fullNISTMetrics)

      result.forEach(func => {
        expect(func.maxScore).toBe(5)
      })
    })

    it('all function scores are within valid range', () => {
      const result = recalculateFunctionsWithMetrics(fullNISTMetrics)

      result.forEach(func => {
        expect(func.score).toBeGreaterThanOrEqual(0)
        expect(func.score).toBeLessThanOrEqual(func.maxScore)
      })
    })
  })

  describe('GV: Govern function scoring', () => {
    it('awards 2 points for active intent checks', () => {
      const result = recalculateFunctionsWithMetrics(fullNISTMetrics)
      const govFunc = result.find(f => f.id === 'GV')

      expect(govFunc).toBeDefined()
      // With 150 intent checks, should get 2 points for GV.RM-1
      const intentDetail = govFunc?.details?.find(d => d.id === 'GV.RM-1')
      expect(intentDetail?.calculatedPoints).toBe(2)
    })

    it('penalizes discovery issues', () => {
      const result = recalculateFunctionsWithMetrics(fullNISTMetrics)
      const govFunc = result.find(f => f.id === 'GV')

      // With 5 discovery issues (1-10 range), should get 2 points (3 - 1 penalty)
      const discoveryDetail = govFunc?.details?.find(d => d.id === 'GV.OV-03')
      expect(discoveryDetail?.calculatedPoints).toBe(2)
    })
  })

  describe('ID: Identify function scoring', () => {
    it('awards points for device and site inventory', () => {
      const result = recalculateFunctionsWithMetrics(fullNISTMetrics)
      const idFunc = result.find(f => f.id === 'ID')

      expect(idFunc).toBeDefined()
      const inventoryDetail = idFunc?.details?.find(d => d.id === 'ID.AM-1')
      // Should get 20 points (10 for devices + 10 for sites)
      expect(inventoryDetail?.calculatedPoints).toBe(20)
    })

    it('calculates version variance points correctly', () => {
      const result = recalculateFunctionsWithMetrics(fullNISTMetrics)
      const idFunc = result.find(f => f.id === 'ID')

      const softwareDetail = idFunc?.details?.find(d => d.id === 'ID.AM-2')
      // With variance of 3 (1-3 range), should get 10 points for variance
      // Plus 10 for platforms > 0 = 20 total
      expect(softwareDetail?.calculatedPoints).toBe(20)
    })
  })

  describe('PR: Protect function scoring', () => {
    it('calculates AAA coverage points', () => {
      const result = recalculateFunctionsWithMetrics(fullNISTMetrics)
      const prFunc = result.find(f => f.id === 'PR')

      const aaaDetail = prFunc?.details?.find(d => d.id === 'PR.AA-01')
      // 75% AAA = 7.5 points, 60% local users = 6 points = 13.5 total
      expect(aaaDetail?.calculatedPoints).toBeCloseTo(13.5, 0)
    })

    it('penalizes End of Support devices', () => {
      const result = recalculateFunctionsWithMetrics(fullNISTMetrics)
      const prFunc = result.find(f => f.id === 'PR')

      const eosDetail = prFunc?.details?.find(d => d.id === 'PR.PS-02')
      // 5% EoS = (100-5)/100 * 10 = 9.5 points
      expect(eosDetail?.calculatedPoints).toBeCloseTo(9.5, 0)
    })
  })

  describe('RS: Respond function scoring', () => {
    it('penalizes ANY/ANY ACL rules', () => {
      const result = recalculateFunctionsWithMetrics(fullNISTMetrics)
      const rsFunc = result.find(f => f.id === 'RS')

      const aclDetail = rsFunc?.details?.find(d => d.id === 'RS.MI-01')
      // 15 ANY/ANY rules = 50 - 15 = 35 raw points
      expect(aclDetail?.calculatedPoints).toBe(35)
    })
  })
})

// =============================================================================
// UNAVAILABLE METRICS HANDLING
// =============================================================================

describe('handling unavailable metrics', () => {
  it('returns zero points for unavailable metrics', () => {
    const result = recalculateFunctionsWithMetrics(minimalNISTMetrics)

    // ID function should have low score due to missing data
    const idFunc = result.find(f => f.id === 'ID')
    expect(idFunc?.score).toBeLessThan(5)
  })

  it('includes breakdown with unavailable site data', () => {
    const result = recalculateFunctionsWithMetrics(minimalNISTMetrics)

    const idFunc = result.find(f => f.id === 'ID')
    const inventoryDetail = idFunc?.details?.find(d => d.id === 'ID.AM-1')

    // Should have breakdown showing site count is unavailable
    const siteBreakdown = inventoryDetail?.breakdown?.find(b => b.metric === 'Site Count')
    expect(siteBreakdown?.value).toBe('Data Unavailable')
    expect(siteBreakdown?.points).toBe(0) // No points for unavailable data
  })

  it('Govern function still calculates discovery penalty', () => {
    const result = recalculateFunctionsWithMetrics(minimalNISTMetrics)

    const govFunc = result.find(f => f.id === 'GV')
    const discoveryDetail = govFunc?.details?.find(d => d.id === 'GV.OV-03')

    // 50 discovery issues = 3 point penalty = 0 points
    expect(discoveryDetail?.calculatedPoints).toBe(0)
  })
})

// =============================================================================
// DELTA CALCULATIONS
// =============================================================================

describe('delta calculations', () => {
  it('calculates delta direction correctly for positive changes', () => {
    const result = recalculateFunctionsWithMetrics(fullNISTMetrics)

    const prFunc = result.find(f => f.id === 'PR')
    const loggingDetail = prFunc?.details?.find(d => d.id === 'PR.PS-04')

    // Local logging went from 85% to 90% = positive
    expect(loggingDetail?.deltaDirection).toBe('positive')
  })

  it('calculates delta for ANY/ANY ACL reduction', () => {
    const result = recalculateFunctionsWithMetrics(fullNISTMetrics)

    const rsFunc = result.find(f => f.id === 'RS')
    const aclDetail = rsFunc?.details?.find(d => d.id === 'RS.MI-01')

    // ANY/ANY went from 18 to 15 = decrease = positive for reverse polarity
    expect(aclDetail?.delta).toBe(-3)
    expect(aclDetail?.deltaDirection).toBe('positive') // Less is better
  })
})

// =============================================================================
// EXTRACT METRICS
// =============================================================================

describe('extractMetricsFromFunctions', () => {
  it('returns metrics object with device and site counts', () => {
    const functions = recalculateFunctionsWithMetrics(fullNISTMetrics)
    const result = extractMetricsFromFunctions(functions, 150, 10)

    expect(result.totalDevices).toBe(150)
    expect(result.totalSites).toBe(10)
  })
})
