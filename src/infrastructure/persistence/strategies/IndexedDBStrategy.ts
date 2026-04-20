import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { PersistenceStrategy } from '../PersistenceManager'

interface PersistenceDB extends DBSchema {
  'persistence-store': {
    key: string
    value: {
      key: string
      data: any
      timestamp: number
    }
  }
}

export class IndexedDBStrategy implements PersistenceStrategy {
  private dbName = 'IPFabricDashboard'
  private storeName = 'persistence-store' as const
  private version = 1
  private db: IDBPDatabase<PersistenceDB> | null = null

  private async getDB(): Promise<IDBPDatabase<PersistenceDB>> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !this.isAvailable()) {
      throw new Error('IndexedDB is not available in this environment')
    }

    if (!this.db) {
      this.db = await openDB<PersistenceDB>(this.dbName, this.version, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('persistence-store')) {
            db.createObjectStore('persistence-store', {
              keyPath: 'key'
            })
          }
        }
      })
    }
    return this.db
  }

  public async save(key: string, data: any): Promise<void> {
    try {
      const db = await this.getDB()
      await db.put(this.storeName, {
        key,
        data,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('IndexedDB save error:', error)
      throw new Error('Failed to save data to IndexedDB')
    }
  }

  public async load(key: string): Promise<any> {
    try {
      const db = await this.getDB()
      const result = await db.get(this.storeName, key)
      return result?.data || null
    } catch (error) {
      console.error('IndexedDB load error:', error)
      return null
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB()
      await db.delete(this.storeName, key)
    } catch (error) {
      console.error('IndexedDB delete error:', error)
      throw new Error('Failed to delete data from IndexedDB')
    }
  }

  public async clear(): Promise<void> {
    try {
      const db = await this.getDB()
      await db.clear(this.storeName)
    } catch (error) {
      console.error('IndexedDB clear error:', error)
      throw new Error('Failed to clear IndexedDB')
    }
  }

  public async getSize(): Promise<number> {
    try {
      const db = await this.getDB()
      const tx = db.transaction(this.storeName, 'readonly')
      const store = tx.objectStore(this.storeName)

      let size = 0
      let cursor = await store.openCursor()

      while (cursor) {
        // Estimate size by converting to JSON
        const dataStr = JSON.stringify(cursor.value)
        size += dataStr.length * 2 // UTF-16 encoding (2 bytes per character)
        cursor = await cursor.continue()
      }

      return size
    } catch (error) {
      console.error('IndexedDB getSize error:', error)
      return 0
    }
  }

  public isAvailable(): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      return 'indexedDB' in window && !!window.indexedDB
    } catch {
      return false
    }
  }

  public async getAllKeys(): Promise<string[]> {
    try {
      const db = await this.getDB()
      const tx = db.transaction(this.storeName, 'readonly')
      const keys = await tx.objectStore(this.storeName).getAllKeys()
      return keys as string[]
    } catch (error) {
      console.error('IndexedDB getAllKeys error:', error)
      return []
    }
  }

  public async getAll(): Promise<Record<string, any>> {
    try {
      const db = await this.getDB()
      const tx = db.transaction(this.storeName, 'readonly')
      const allData = await tx.objectStore(this.storeName).getAll()

      const result: Record<string, any> = {}
      for (const item of allData) {
        result[item.key] = item.data
      }

      return result
    } catch (error) {
      console.error('IndexedDB getAll error:', error)
      return {}
    }
  }
}