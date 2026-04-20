// PCI-DSS v4.0.1 Framework Registration
// Registers PCI-DSS with the framework registry for multi-framework support

import { frameworkRegistry } from '../shared/registry'
import { calculatePCIDSSRequirementsProgressive, calculateOverallPCIDSSScore } from './calculator'
import { getRequirementDescription } from './descriptions'
import type { FrameworkConfig } from '../shared/types'

// PCI-DSS v4.0.1 configuration (Network Infrastructure Focus)
const pciDssConfig: FrameworkConfig = {
  id: 'pci-dss',
  name: 'PCI-DSS',
  version: 'v4.0.1',
  maxScore: 155,
  categoryLabel: 'Requirement',
  checkLabel: 'Sub-Requirement',
  totalCategories: 8,
  getBatchDescription: (batch: number) => {
    const descriptions: Record<number, string> = {
      1: 'Loading network security & configuration (Req 1, 2)',
      2: 'Loading systems & access controls (Req 6, 7)',
      3: 'Loading authentication & logging (Req 8, 10)',
      4: 'Loading testing & policy (Req 11, 12)'
    }
    return descriptions[batch] || ''
  },
  categories: [
    { id: '1', name: 'Network Security Controls', maxScore: 55 },
    { id: '2', name: 'Secure Configurations', maxScore: 35 },
    { id: '6', name: 'Secure Systems and Software', maxScore: 5 },
    { id: '7', name: 'Access Restrictions', maxScore: 5 },
    { id: '8', name: 'User Authentication', maxScore: 15 },
    { id: '10', name: 'Logging and Monitoring', maxScore: 15 },
    { id: '11', name: 'Security Testing', maxScore: 5 },
    { id: '12', name: 'Information Security Policy', maxScore: 20 }
  ]
}

// Register PCI-DSS framework
frameworkRegistry.register({
  config: pciDssConfig,
  calculator: {
    calculateProgressive: calculatePCIDSSRequirementsProgressive,
    calculateOverallScore: calculateOverallPCIDSSScore
  },
  getDescription: getRequirementDescription
})
