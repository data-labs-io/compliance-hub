import LZString from 'lz-string'
import { IndexedDBStrategy } from './strategies/IndexedDBStrategy'
import { LocalStorageStrategy } from './strategies/LocalStorageStrategy'
import { CookieStrategy } from './strategies/CookieStrategy'

export type StorageStrategy = 'indexedDB' | 'localStorage' | 'cookies'

export interface PersistenceStrategy {
  save(key: string, data: any): Promise<void>
  load(key: string): Promise<any>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  getSize(): Promise<number>
  isAvailable(): boolean
}

export interface PersistenceOptions {
  compress?: boolean
  encrypt?: boolean
  autoSave?: boolean
  debounceMs?: number
  maxSize?: number
  ttl?: number // Time to live in milliseconds
}

export class PersistenceManager {
  private static instance: PersistenceManager
  private strategies: Map<StorageStrategy, PersistenceStrategy>
  private currentStrategy: StorageStrategy
  private options: PersistenceOptions
  private saveTimers: Map<string, NodeJS.Timeout>
  private cache: Map<string, { data: any; timestamp: number }>

  private constructor() {
    this.strategies = new Map()
    this.saveTimers = new Map()
    this.cache = new Map()
    this.currentStrategy = 'indexedDB'
    this.options = {
      compress: true,
      encrypt: false,
      autoSave: true,
      debounceMs: 1000,
      maxSize: 50 * 1024 * 1024, // 50MB
      ttl: 30 * 24 * 60 * 60 * 1000 // 30 days
    }

    this.initializeStrategies()
    this.selectBestAvailableStrategy()
  }

  public static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance) {
      PersistenceManager.instance = new PersistenceManager()
    }
    return PersistenceManager.instance
  }

  private initializeStrategies(): void {
    this.strategies.set('indexedDB', new IndexedDBStrategy())
    this.strategies.set('localStorage', new LocalStorageStrategy())
    this.strategies.set('cookies', new CookieStrategy())
  }

  private selectBestAvailableStrategy(): void {
    // Try strategies in order of preference
    const preferenceOrder: StorageStrategy[] = ['indexedDB', 'localStorage', 'cookies']

    for (const strategy of preferenceOrder) {
      const strategyInstance = this.strategies.get(strategy)
      if (strategyInstance?.isAvailable()) {
        this.currentStrategy = strategy
        return
      }
    }

    // If no strategy is available, default to cookies (should always work)
    console.warn('PersistenceManager: No preferred strategy available, falling back to cookies')
    this.currentStrategy = 'cookies'
  }

  public setStrategy(strategy: StorageStrategy): void {
    if (!this.strategies.has(strategy)) {
      throw new Error(`Strategy ${strategy} not found`)
    }

    const targetStrategy = this.strategies.get(strategy)
    if (!targetStrategy?.isAvailable()) {
      throw new Error(`Strategy ${strategy} is not available in this environment`)
    }

    this.currentStrategy = strategy
  }

  public setOptions(options: Partial<PersistenceOptions>): void {
    this.options = { ...this.options, ...options }
  }

  public async save(key: string, data: any, immediate = false): Promise<void> {
    // Clear existing timer if debouncing
    if (this.saveTimers.has(key)) {
      clearTimeout(this.saveTimers.get(key)!)
    }

    if (immediate || !this.options.autoSave) {
      return this.performSave(key, data)
    }

    // Debounced save
    return new Promise((resolve, reject) => {
      const timer = setTimeout(async () => {
        try {
          await this.performSave(key, data)
          resolve()
        } catch (error) {
          reject(error)
        } finally {
          this.saveTimers.delete(key)
        }
      }, this.options.debounceMs)

      this.saveTimers.set(key, timer)
    })
  }

  private async performSave(key: string, data: any): Promise<void> {
    const strategy = this.strategies.get(this.currentStrategy)
    if (!strategy) {
      throw new Error('No strategy available')
    }

    let processedData = data

    // Compress if enabled
    if (this.options.compress) {
      const jsonString = JSON.stringify(data)
      processedData = LZString.compressToUTF16(jsonString)
    }

    // Add metadata
    const wrappedData = {
      data: processedData,
      compressed: this.options.compress,
      encrypted: this.options.encrypt,
      timestamp: Date.now(),
      ttl: this.options.ttl,
      version: '1.0.0'
    }

    await strategy.save(key, wrappedData)

    // Update cache
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  public async load(key: string): Promise<any> {
    // Check cache first
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < 5000) { // 5 second cache
      return cached.data
    }

    const strategy = this.strategies.get(this.currentStrategy)
    if (!strategy) {
      console.error('PersistenceManager: No strategy available for load')
      return null
    }

    try {
      const wrappedData = await strategy.load(key)
      if (!wrappedData) {
        return null
      }

      // Check TTL
      if (wrappedData.ttl && Date.now() - wrappedData.timestamp > wrappedData.ttl) {
        await this.delete(key)
        return null
      }

      let data = wrappedData.data

      // Decompress if needed
      if (wrappedData.compressed) {
        const decompressed = LZString.decompressFromUTF16(data)
        if (decompressed) {
          data = JSON.parse(decompressed)
        }
      }

      // Update cache
      this.cache.set(key, { data, timestamp: Date.now() })

      return data
    } catch (error) {
      console.error(`PersistenceManager: Failed to load with ${this.currentStrategy}:`, error)
      return null
    }
  }

  public async delete(key: string): Promise<void> {
    const strategy = this.strategies.get(this.currentStrategy)
    if (!strategy) {
      throw new Error('No strategy available')
    }

    // Clear any pending save timers
    if (this.saveTimers.has(key)) {
      clearTimeout(this.saveTimers.get(key)!)
      this.saveTimers.delete(key)
    }

    // Remove from cache
    this.cache.delete(key)

    await strategy.delete(key)
  }

  public async clear(): Promise<void> {
    const strategy = this.strategies.get(this.currentStrategy)
    if (!strategy) {
      throw new Error('No strategy available')
    }

    // Clear all timers
    this.saveTimers.forEach(timer => clearTimeout(timer))
    this.saveTimers.clear()

    // Clear cache
    this.cache.clear()

    await strategy.clear()
  }

  public async getSize(): Promise<number> {
    const strategy = this.strategies.get(this.currentStrategy)
    if (!strategy) {
      throw new Error('No strategy available')
    }

    return strategy.getSize()
  }

  public async migrate(fromStrategy: StorageStrategy, toStrategy: StorageStrategy, keys: string[]): Promise<void> {
    const from = this.strategies.get(fromStrategy)
    const to = this.strategies.get(toStrategy)

    if (!from || !to) {
      throw new Error('Invalid strategies for migration')
    }

    for (const key of keys) {
      try {
        const data = await from.load(key)
        if (data) {
          await to.save(key, data)
          await from.delete(key)
        }
      } catch (error) {
        console.error(`Failed to migrate key ${key}:`, error)
      }
    }
  }

  public async exportData(keys?: string[]): Promise<Record<string, any>> {
    const strategy = this.strategies.get(this.currentStrategy)
    if (!strategy) {
      throw new Error('No strategy available')
    }

    const exportData: Record<string, any> = {}

    if (!keys) {
      // Export all data - implementation would need to track all keys
      console.warn('Exporting all data is not yet implemented')
      return exportData
    }

    for (const key of keys) {
      try {
        const data = await this.load(key)
        if (data) {
          exportData[key] = data
        }
      } catch (error) {
        console.error(`Failed to export key ${key}:`, error)
      }
    }

    return exportData
  }

  public async importData(data: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      try {
        await this.save(key, value, true)
      } catch (error) {
        console.error(`Failed to import key ${key}:`, error)
      }
    }
  }

  public getAvailableStrategies(): StorageStrategy[] {
    const available: StorageStrategy[] = []

    this.strategies.forEach((strategy, name) => {
      if (strategy.isAvailable()) {
        available.push(name)
      }
    })

    return available
  }

  public getCurrentStrategy(): StorageStrategy {
    return this.currentStrategy
  }
}