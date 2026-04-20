// Shared Framework Abstraction Layer
// Export types, registry, and auto-register all frameworks

export * from './types'
export * from './registry'

// Auto-register frameworks when this module is imported
// Each register file will call frameworkRegistry.register()
import '../cis/register'
import '../pci-dss/register'
import '../nist-csf/register'
import '../nis2/register'