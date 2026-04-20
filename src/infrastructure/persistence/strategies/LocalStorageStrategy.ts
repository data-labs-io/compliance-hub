import { PersistenceStrategy } from '../PersistenceManager'

export class LocalStorageStrategy implements PersistenceStrategy {
  private prefix = 'ipfabric_'

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  public async save(key: string, data: any): Promise<void> {
    try {
      const fullKey = this.getKey(key)
      const serialized = JSON.stringify(data)

      // Check if we're exceeding localStorage quota (usually 5-10MB)
      const currentSize = await this.getSize()
      const newDataSize = serialized.length * 2 // UTF-16 encoding
      const maxSize = 5 * 1024 * 1024 // 5MB limit

      if (currentSize + newDataSize > maxSize) {
        // Try to free up space by removing old items
        await this.cleanupOldItems()

        // Check again
        const newCurrentSize = await this.getSize()
        if (newCurrentSize + newDataSize > maxSize) {
          throw new Error('LocalStorage quota exceeded')
        }
      }

      localStorage.setItem(fullKey, serialized)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error('LocalStorage quota exceeded')
      }
      console.error('LocalStorage save error:', error)
      throw new Error('Failed to save data to LocalStorage')
    }
  }

  public async load(key: string): Promise<any> {
    try {
      const fullKey = this.getKey(key)
      const data = localStorage.getItem(fullKey)

      if (!data) {
        return null
      }

      return JSON.parse(data)
    } catch (error) {
      console.error('LocalStorage load error:', error)
      return null
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getKey(key)
      localStorage.removeItem(fullKey)
    } catch (error) {
      console.error('LocalStorage delete error:', error)
      throw new Error('Failed to delete data from LocalStorage')
    }
  }

  public async clear(): Promise<void> {
    try {
      const keys = this.getAllKeys()
      keys.forEach(key => {
        localStorage.removeItem(key)
      })
    } catch (error) {
      console.error('LocalStorage clear error:', error)
      throw new Error('Failed to clear LocalStorage')
    }
  }

  public async getSize(): Promise<number> {
    try {
      let size = 0
      const keys = this.getAllKeys()

      keys.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          // Estimate size (key + value) * 2 for UTF-16 encoding
          size += (key.length + value.length) * 2
        }
      })

      return size
    } catch (error) {
      console.error('LocalStorage getSize error:', error)
      return 0
    }
  }

  public isAvailable(): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      const testKey = '__localStorage_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  private getAllKeys(): string[] {
    const keys: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        keys.push(key)
      }
    }

    return keys
  }

  private async cleanupOldItems(): Promise<void> {
    try {
      const items: { key: string; timestamp: number }[] = []
      const keys = this.getAllKeys()

      // Collect all items with timestamps
      for (const key of keys) {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            const parsed = JSON.parse(value)
            if (parsed.timestamp) {
              items.push({
                key,
                timestamp: parsed.timestamp
              })
            }
          }
        } catch {
          // Skip items that can't be parsed
          continue
        }
      }

      // Sort by timestamp (oldest first)
      items.sort((a, b) => a.timestamp - b.timestamp)

      // Remove oldest 25% of items
      const itemsToRemove = Math.ceil(items.length * 0.25)
      for (let i = 0; i < itemsToRemove && i < items.length; i++) {
        localStorage.removeItem(items[i].key)
      }
    } catch (error) {
      console.error('LocalStorage cleanup error:', error)
    }
  }

  public async getAllData(): Promise<Record<string, any>> {
    const result: Record<string, any> = {}
    const keys = this.getAllKeys()

    for (const key of keys) {
      try {
        const value = localStorage.getItem(key)
        if (value) {
          const cleanKey = key.replace(this.prefix, '')
          result[cleanKey] = JSON.parse(value)
        }
      } catch {
        // Skip items that can't be parsed
        continue
      }
    }

    return result
  }
}