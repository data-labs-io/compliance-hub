// NIS2 Directive Framework Registration
// Registers NIS2 with the framework registry for multi-framework support

import { frameworkRegistry } from '../shared/registry'
import { calculateNIS2Progressive, calculateOverallNIS2Score } from './calculator'
import { getNIS2Description } from './descriptions'
import type { FrameworkConfig } from '../shared/types'

// NIS2 Directive configuration
const nis2Config: FrameworkConfig = {
  id: 'nis2',
  name: 'NIS2',
  version: 'EU 2022/2555',
  maxScore: 200,                   // 185 (Article 21) + 15 (Article 27)
  categoryLabel: 'Article',
  checkLabel: 'Check',
  totalCategories: 8,
  getBatchDescription: (batch: number) => {
    const descriptions: Record<number, string> = {
      1: 'Loading incident handling & business continuity (21.2.B, 21.2.C)',
      2: 'Loading supply chain & vulnerability handling (21.2.D, 21.2.E)',
      3: 'Loading risk assessment & cryptography (21.2.F, 21.2.H)',
      4: 'Loading access control & entity registration (21.2.I, 27.2.F)'
    }
    return descriptions[batch] || ''
  },
  categories: [
    { id: '21.2.B', name: 'Incident Handling', maxScore: 60 },
    { id: '21.2.C', name: 'Business Continuity', maxScore: 25 },
    { id: '21.2.D', name: 'Supply Chain Security', maxScore: 20 },
    { id: '21.2.E', name: 'Vulnerability Handling', maxScore: 5 },
    { id: '21.2.F', name: 'Risk Management Assessment', maxScore: 30 },
    { id: '21.2.H', name: 'Cryptography & Encryption', maxScore: 10 },
    { id: '21.2.I', name: 'Access Control & Asset Management', maxScore: 35 },
    { id: '27.2.F', name: 'Entity IP Ranges', maxScore: 15 }
  ]
}

// Register NIS2 framework
frameworkRegistry.register({
  config: nis2Config,
  calculator: {
    calculateProgressive: calculateNIS2Progressive,
    calculateOverallScore: calculateOverallNIS2Score
  },
  getDescription: getNIS2Description
})
