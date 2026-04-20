// CIS Controls v8.1 Framework Registration
// Registers CIS with the framework registry for multi-framework support

import { frameworkRegistry } from '../shared/registry'
import { calculateCISControlsProgressive, calculateOverallCISScore } from './calculator'
import { getControlDescription } from './descriptions'
import type { FrameworkConfig } from '../shared/types'

// CIS Controls v8.1 configuration
const cisConfig: FrameworkConfig = {
  id: 'cis-v8',
  name: 'CIS Controls',
  version: 'v8.1',
  maxScore: 110,
  categoryLabel: 'Control',
  checkLabel: 'Safeguard',
  totalCategories: 11,
  getBatchDescription: (batch: number) => {
    const descriptions: Record<number, string> = {
      1: 'Loading foundation controls (1, 2, 3)',
      2: 'Loading configuration & access controls (4, 5, 6)',
      3: 'Loading logging & infrastructure controls (8, 12)',
      4: 'Loading monitoring, response & testing controls (13, 17, 18)'
    }
    return descriptions[batch] || ''
  },
  categories: [
    { id: '1', name: 'Inventory and Control of Enterprise Assets', maxScore: 10 },
    { id: '2', name: 'Inventory and Control of Software Assets', maxScore: 10 },
    { id: '3', name: 'Data Protection', maxScore: 8 },
    { id: '4', name: 'Secure Configuration of Enterprise Assets and Software', maxScore: 10 },
    { id: '5', name: 'Account Management', maxScore: 10 },
    { id: '6', name: 'Access Control Management', maxScore: 10 },
    { id: '8', name: 'Audit Log Management', maxScore: 10 },
    { id: '12', name: 'Network Infrastructure Management', maxScore: 10 },
    { id: '13', name: 'Network Monitoring and Defense', maxScore: 10 },
    { id: '17', name: 'Incident Response Management', maxScore: 10 },
    { id: '18', name: 'Penetration Testing', maxScore: 10 }
  ]
}

// Register CIS framework
frameworkRegistry.register({
  config: cisConfig,
  calculator: {
    calculateProgressive: calculateCISControlsProgressive,
    calculateOverallScore: calculateOverallCISScore
  },
  getDescription: getControlDescription
})
