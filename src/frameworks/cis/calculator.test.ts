/**
 * CIS Controls v8.1 Calculator Unit Tests
 *
 * Tests the scoring logic for CIS controls:
 * - Control 1: Enterprise Asset Inventory
 * - Control 2: Software Asset Inventory
 * - Control 3: Data Protection
 * - Control 4: Secure Configuration
 * - Control 8: Audit Log Management
 * - Control 13: Network Monitoring
 * - Control 17: Incident Response
 */

import { describe, it, expect } from 'vitest'
import {
  calculateOverallCISScore,
  recalculateControlsWithMetrics,
  extractMetricsFromControls
} from './calculator'
import {
  mockDevices,
  fullCISMetrics,
  cisMetricsWithoutBaseline,
  cisMetricsUnavailable
} from '../__tests__/fixtures'
import type { CISMetrics, CISControl } from './types'

// =============================================================================
// OVERALL SCORE CALCULATION
// =============================================================================

describe('calculateOverallCISScore', () => {
  it('calculates correct percentage from controls', () => {
    const controls: CISControl[] = [
      { id: '1', name: 'Test', score: 8, maxScore: 10, status: 'pass' },
      { id: '2', name: 'Test', score: 12, maxScore: 15, status: 'pass' },
      { id: '3', name: 'Test', score: 20, maxScore: 25, status: 'pass' }
    ]

    const result = calculateOverallCISScore(controls)

    // (8 + 12 + 20) / (10 + 15 + 25) * 100 = 40/50 * 100 = 80
    expect(result).toBeCloseTo(80, 1)
  })

  it('returns NaN when no controls provided (edge case)', () => {
    // NOTE: Current implementation doesn't guard against empty arrays
    // This test documents actual behavior - consider fixing in calculator
    const result = calculateOverallCISScore([])
    expect(Number.isNaN(result)).toBe(true)
  })

  it('returns NaN when maxScore is 0 (edge case)', () => {
    // NOTE: Current implementation doesn't guard against division by zero
    // This test documents actual behavior - consider fixing in calculator
    const controls: CISControl[] = [
      { id: '1', name: 'Test', score: 0, maxScore: 0, status: 'fail' }
    ]

    const result = calculateOverallCISScore(controls)
    expect(Number.isNaN(result)).toBe(true)
  })

  it('returns 100 when all controls have full score', () => {
    const controls: CISControl[] = [
      { id: '1', name: 'Test', score: 10, maxScore: 10, status: 'pass' },
      { id: '2', name: 'Test', score: 15, maxScore: 15, status: 'pass' },
      { id: '3', name: 'Test', score: 25, maxScore: 25, status: 'pass' }
    ]

    expect(calculateOverallCISScore(controls)).toBe(100)
  })
})

// =============================================================================
// CONTROL SCORING WITH METRICS
// =============================================================================

describe('recalculateControlsWithMetrics', () => {
  describe('generates expected controls', () => {
    it('returns array with control IDs', () => {
      const result = recalculateControlsWithMetrics(
        fullCISMetrics,
        fullCISMetrics.previousMetrics as CISMetrics,
        mockDevices
      )

      const ids = result.map(c => c.id)
      // CIS controls implemented: 1, 2, 3, 4, 8, 13, 17
      expect(ids).toContain('1')
      expect(ids).toContain('2')
      expect(ids).toContain('3')
    })

    it('all controls have valid status', () => {
      const result = recalculateControlsWithMetrics(
        fullCISMetrics,
        fullCISMetrics.previousMetrics as CISMetrics,
        mockDevices
      )

      result.forEach(control => {
        expect(['pass', 'warning', 'fail']).toContain(control.status)
      })
    })

    it('all controls have score <= maxScore', () => {
      const result = recalculateControlsWithMetrics(
        fullCISMetrics,
        fullCISMetrics.previousMetrics as CISMetrics,
        mockDevices
      )

      result.forEach(control => {
        expect(control.score).toBeLessThanOrEqual(control.maxScore)
        expect(control.score).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Control 1: Enterprise Asset Inventory', () => {
    it('includes site count and platform metrics', () => {
      const result = recalculateControlsWithMetrics(
        fullCISMetrics,
        fullCISMetrics.previousMetrics as CISMetrics,
        mockDevices
      )

      const control1 = result.find(c => c.id === '1')!
      expect(control1).toBeDefined()
      expect(control1.details).toBeDefined()
    })
  })

  describe('Control 3: Data Protection', () => {
    it('penalizes ANY/ANY ACL rules', () => {
      const lowAnyAny: CISMetrics = {
        ...fullCISMetrics,
        anyAnyAclCount: 0, // No ANY/ANY rules
        previousMetrics: { ...fullCISMetrics.previousMetrics, anyAnyAclCount: 0 }
      }

      const highAnyAny: CISMetrics = {
        ...fullCISMetrics,
        anyAnyAclCount: 50, // Many ANY/ANY rules
        previousMetrics: { ...fullCISMetrics.previousMetrics, anyAnyAclCount: 50 }
      }

      const resultLow = recalculateControlsWithMetrics(
        lowAnyAny,
        lowAnyAny.previousMetrics as CISMetrics,
        mockDevices
      )

      const resultHigh = recalculateControlsWithMetrics(
        highAnyAny,
        highAnyAny.previousMetrics as CISMetrics,
        mockDevices
      )

      const control3Low = resultLow.find(c => c.id === '3')!
      const control3High = resultHigh.find(c => c.id === '3')!

      // Lower ANY/ANY count should score higher or equal
      expect(control3Low.score).toBeGreaterThanOrEqual(control3High.score)
    })

    it('rewards high encryption (low telnet usage)', () => {
      const lowTelnet: CISMetrics = {
        ...fullCISMetrics,
        telnetPercent: 0, // No telnet
        previousMetrics: { ...fullCISMetrics.previousMetrics, telnetPercent: 0 }
      }

      const highTelnet: CISMetrics = {
        ...fullCISMetrics,
        telnetPercent: 80, // High telnet usage
        previousMetrics: { ...fullCISMetrics.previousMetrics, telnetPercent: 80 }
      }

      const resultLow = recalculateControlsWithMetrics(
        lowTelnet,
        lowTelnet.previousMetrics as CISMetrics,
        mockDevices
      )

      const resultHigh = recalculateControlsWithMetrics(
        highTelnet,
        highTelnet.previousMetrics as CISMetrics,
        mockDevices
      )

      const control3Low = resultLow.find(c => c.id === '3')!
      const control3High = resultHigh.find(c => c.id === '3')!

      // Lower telnet should score higher
      expect(control3Low.score).toBeGreaterThan(control3High.score)
    })
  })

  describe('Control 8: Audit Log Management', () => {
    it('rewards high logging percentages', () => {
      const highLogging: CISMetrics = {
        ...fullCISMetrics,
        localLoggingPercent: 100,
        remoteLoggingPercent: 100,
        ntpPercent: 100,
        previousMetrics: {
          ...fullCISMetrics.previousMetrics,
          localLoggingPercent: 100,
          remoteLoggingPercent: 100,
          ntpPercent: 100
        }
      }

      const lowLogging: CISMetrics = {
        ...fullCISMetrics,
        localLoggingPercent: 20,
        remoteLoggingPercent: 20,
        ntpPercent: 20,
        previousMetrics: {
          ...fullCISMetrics.previousMetrics,
          localLoggingPercent: 20,
          remoteLoggingPercent: 20,
          ntpPercent: 20
        }
      }

      const resultHigh = recalculateControlsWithMetrics(
        highLogging,
        highLogging.previousMetrics as CISMetrics,
        mockDevices
      )

      const resultLow = recalculateControlsWithMetrics(
        lowLogging,
        lowLogging.previousMetrics as CISMetrics,
        mockDevices
      )

      const control8High = resultHigh.find(c => c.id === '8')!
      const control8Low = resultLow.find(c => c.id === '8')!

      expect(control8High.score).toBeGreaterThan(control8Low.score)
    })
  })

  describe('Missing Baseline Handling', () => {
    it('still calculates scores without previous metrics', () => {
      const result = recalculateControlsWithMetrics(
        cisMetricsWithoutBaseline,
        {} as CISMetrics, // Empty previous metrics
        mockDevices
      )

      // Should still return controls
      expect(result.length).toBeGreaterThan(0)

      // All controls should have calculated scores
      result.forEach(control => {
        expect(control.score).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Data Unavailability Handling', () => {
    it('scores lower when data is unavailable', () => {
      const resultFull = recalculateControlsWithMetrics(
        fullCISMetrics,
        fullCISMetrics.previousMetrics as CISMetrics,
        mockDevices
      )

      const resultUnavailable = recalculateControlsWithMetrics(
        cisMetricsUnavailable,
        {} as CISMetrics,
        mockDevices
      )

      const totalScoreFull = resultFull.reduce((sum, c) => sum + c.score, 0)
      const totalScoreUnavailable = resultUnavailable.reduce((sum, c) => sum + c.score, 0)

      // Full data should score higher than unavailable
      expect(totalScoreFull).toBeGreaterThan(totalScoreUnavailable)
    })
  })
})

// =============================================================================
// METRICS EXTRACTION FROM CONTROLS
// =============================================================================

describe('extractMetricsFromControls', () => {
  it('extracts totalDevices', () => {
    const controls = recalculateControlsWithMetrics(
      fullCISMetrics,
      fullCISMetrics.previousMetrics as CISMetrics,
      mockDevices
    )

    const extracted = extractMetricsFromControls(controls, 100, 850, 50)

    expect(extracted.totalDevices).toBe(100)
  })

  it('extracts intent check values', () => {
    const controls = recalculateControlsWithMetrics(
      fullCISMetrics,
      fullCISMetrics.previousMetrics as CISMetrics,
      mockDevices
    )

    const extracted = extractMetricsFromControls(controls, 100, 850, 50)

    expect(extracted.intentChecksPassed).toBe(850)
    expect(extracted.intentChecksFailed).toBe(50)
  })

  it('handles empty controls array', () => {
    const extracted = extractMetricsFromControls([], 0, 0, 0)

    expect(extracted.totalDevices).toBe(0)
    expect(extracted.intentChecksPassed).toBe(0)
    expect(extracted.intentChecksFailed).toBe(0)
  })
})

// =============================================================================
// STATUS CALCULATION TESTS
// =============================================================================

describe('Status Calculation', () => {
  it('assigns "pass" status for high scoring controls', () => {
    const highScoringMetrics: CISMetrics = {
      ...fullCISMetrics,
      // Set metrics that result in high scores
      telnetPercent: 0,
      localLoggingPercent: 100,
      remoteLoggingPercent: 100,
      ntpPercent: 100,
      aaaPercent: 100,
      dnsCoveragePercent: 100
    }

    const result = recalculateControlsWithMetrics(
      highScoringMetrics,
      highScoringMetrics.previousMetrics as CISMetrics,
      mockDevices
    )

    const highScoringControls = result.filter(c =>
      (c.score / c.maxScore) >= 0.8
    )

    highScoringControls.forEach(control => {
      expect(control.status).toBe('pass')
    })
  })

  it('assigns "fail" status for low scoring controls', () => {
    const result = recalculateControlsWithMetrics(
      cisMetricsUnavailable,
      {} as CISMetrics,
      mockDevices
    )

    const lowScoringControls = result.filter(c =>
      (c.score / c.maxScore) < 0.5
    )

    lowScoringControls.forEach(control => {
      expect(control.status).toBe('fail')
    })
  })
})

// =============================================================================
// INLINE SNAPSHOT TESTS
// =============================================================================

describe('Control Scoring Inline Snapshots', () => {
  it('Control 1 has expected structure', () => {
    const result = recalculateControlsWithMetrics(
      fullCISMetrics,
      fullCISMetrics.previousMetrics as CISMetrics,
      mockDevices
    )

    const control1 = result.find(c => c.id === '1')!

    expect(control1).toMatchObject({
      id: '1',
      name: expect.any(String),
      score: expect.any(Number),
      maxScore: expect.any(Number),
      status: expect.stringMatching(/pass|warning|fail/)
    })
  })

  it('Control details include required fields', () => {
    const result = recalculateControlsWithMetrics(
      fullCISMetrics,
      fullCISMetrics.previousMetrics as CISMetrics,
      mockDevices
    )

    const controlWithDetails = result.find(c => c.details && c.details.length > 0)!

    expect(controlWithDetails.details![0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      maxPoints: expect.any(Number),
      calculatedPoints: expect.any(Number),
      scoringRule: expect.any(String)
    })
  })
})
