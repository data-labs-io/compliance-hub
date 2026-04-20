// Framework Registry - Strategy Pattern Implementation
// Allows registration and retrieval of framework implementations

import type { FrameworkConfig, FrameworkId, ProgressiveCalculator, ScoreCalculator } from './types'

// Registered framework with calculator and description functions
export interface RegisteredFramework {
  config: FrameworkConfig
  calculator: {
    calculateProgressive: ProgressiveCalculator
    calculateOverallScore: ScoreCalculator
  } | null  // null = coming soon (not implemented yet)
  getDescription: (id: string) => any
}

// Framework Registry singleton
class FrameworkRegistry {
  private frameworks = new Map<string, RegisteredFramework>()

  /**
   * Register a framework with its configuration, calculator, and description resolver
   */
  register(framework: RegisteredFramework): void {
    this.frameworks.set(framework.config.id, framework)
  }

  /**
   * Get a registered framework by ID
   */
  get(id: string): RegisteredFramework | undefined {
    return this.frameworks.get(id)
  }

  /**
   * Get all registered frameworks' configurations
   */
  getAvailable(): FrameworkConfig[] {
    return Array.from(this.frameworks.values()).map(f => f.config)
  }

  /**
   * Get all registered frameworks that are fully implemented (have calculators)
   */
  getImplemented(): FrameworkConfig[] {
    return Array.from(this.frameworks.values())
      .filter(f => f.calculator !== null)
      .map(f => f.config)
  }

  /**
   * Check if a framework is fully implemented (has a calculator)
   */
  isImplemented(id: string): boolean {
    const fw = this.frameworks.get(id)
    return fw?.calculator !== null && fw?.calculator !== undefined
  }

  /**
   * Get framework configuration by ID
   */
  getConfig(id: string): FrameworkConfig | undefined {
    return this.frameworks.get(id)?.config
  }

  /**
   * Get framework's description resolver function
   */
  getDescriptionResolver(id: string): ((categoryId: string) => any) | undefined {
    return this.frameworks.get(id)?.getDescription
  }

  /**
   * Get batch description for a framework and batch number
   */
  getBatchDescription(id: string, batchNum: number): string {
    const config = this.getConfig(id)
    return config?.getBatchDescription(batchNum) || ''
  }
}

// Export singleton instance
export const frameworkRegistry = new FrameworkRegistry()
