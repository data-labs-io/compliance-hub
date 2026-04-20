// NIST CSF v2.0 Framework Registration
// Registers NIST CSF with the framework registry for multi-framework support

import { frameworkRegistry } from '../shared/registry'
import { calculateNISTCSFProgressive, calculateOverallNISTCSFScore } from './calculator'
import { getNISTCSFDescription } from './descriptions'
import type { FrameworkConfig } from '../shared/types'

// NIST CSF v2.0 configuration
const nistConfig: FrameworkConfig = {
  id: 'nist',
  name: 'NIST CSF',
  version: 'v2.0',
  maxScore: 30,                    // 6 functions × 5 points each
  categoryLabel: 'Function',
  checkLabel: 'Subcategory',
  totalCategories: 6,
  getBatchDescription: (batch: number) => {
    const descriptions: Record<number, string> = {
      1: 'Loading Govern & Identify functions (GV, ID)',
      2: 'Loading Protect function (PR)',
      3: 'Loading Detect function (DE)',
      4: 'Loading Respond & Recover functions (RS, RC)'
    }
    return descriptions[batch] || ''
  },
  categories: [
    { id: 'GV', name: 'Govern', maxScore: 5 },
    { id: 'ID', name: 'Identify', maxScore: 5 },
    { id: 'PR', name: 'Protect', maxScore: 5 },
    { id: 'DE', name: 'Detect', maxScore: 5 },
    { id: 'RS', name: 'Respond', maxScore: 5 },
    { id: 'RC', name: 'Recover', maxScore: 5 }
  ]
}

// Register NIST CSF framework
frameworkRegistry.register({
  config: nistConfig,
  calculator: {
    calculateProgressive: calculateNISTCSFProgressive,
    calculateOverallScore: calculateOverallNISTCSFScore
  },
  getDescription: getNISTCSFDescription
})
