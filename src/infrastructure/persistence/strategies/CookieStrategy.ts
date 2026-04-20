import Cookies from 'js-cookie'
import { PersistenceStrategy } from '../PersistenceManager'

export class CookieStrategy implements PersistenceStrategy {
  private prefix = 'ipf_'
  private maxCookieSize = 4096 // 4KB per cookie
  private maxCookies = 20 // Browser limit varies, but this is safe

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  public async save(key: string, data: any): Promise<void> {
    try {
      const fullKey = this.getKey(key)
      const serialized = JSON.stringify(data)

      // Check if data fits in a single cookie
      if (serialized.length <= this.maxCookieSize) {
        Cookies.set(fullKey, serialized, {
          expires: 30, // 30 days
          sameSite: 'strict',
          secure: typeof window !== 'undefined' && window.location.protocol === 'https:'
        })
      } else {
        // Split into multiple cookies
        const chunks = this.splitIntoChunks(serialized, this.maxCookieSize - 100) // Leave space for metadata
        const chunkCount = chunks.length

        if (chunkCount > this.maxCookies) {
          throw new Error('Data too large for cookie storage')
        }

        // Save metadata cookie
        Cookies.set(`${fullKey}_meta`, JSON.stringify({
          chunks: chunkCount,
          timestamp: Date.now()
        }), {
          expires: 30,
          sameSite: 'strict',
          secure: typeof window !== 'undefined' && window.location.protocol === 'https:'
        })

        // Save chunk cookies
        chunks.forEach((chunk, index) => {
          Cookies.set(`${fullKey}_${index}`, chunk, {
            expires: 30,
            sameSite: 'strict',
            secure: typeof window !== 'undefined' && window.location.protocol === 'https:'
          })
        })
      }
    } catch (error) {
      console.error('Cookie save error:', error)
      throw new Error('Failed to save data to cookies')
    }
  }

  public async load(key: string): Promise<any> {
    try {
      const fullKey = this.getKey(key)

      // Check for metadata cookie (chunked data)
      const metaCookie = Cookies.get(`${fullKey}_meta`)

      if (metaCookie) {
        // Reassemble chunked data
        const meta = JSON.parse(metaCookie)
        const chunks: string[] = []

        for (let i = 0; i < meta.chunks; i++) {
          const chunk = Cookies.get(`${fullKey}_${i}`)
          if (!chunk) {
            console.error(`Missing chunk ${i} for key ${key}`)
            return null
          }
          chunks.push(chunk)
        }

        const reassembled = chunks.join('')
        return JSON.parse(reassembled)
      } else {
        // Single cookie
        const data = Cookies.get(fullKey)
        if (!data) {
          return null
        }
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('Cookie load error:', error)
      return null
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getKey(key)

      // Check for metadata cookie (chunked data)
      const metaCookie = Cookies.get(`${fullKey}_meta`)

      if (metaCookie) {
        const meta = JSON.parse(metaCookie)

        // Remove all chunk cookies
        for (let i = 0; i < meta.chunks; i++) {
          Cookies.remove(`${fullKey}_${i}`)
        }

        // Remove metadata cookie
        Cookies.remove(`${fullKey}_meta`)
      } else {
        // Remove single cookie
        Cookies.remove(fullKey)
      }
    } catch (error) {
      console.error('Cookie delete error:', error)
      throw new Error('Failed to delete data from cookies')
    }
  }

  public async clear(): Promise<void> {
    try {
      const allCookies = Cookies.get()
      const keysToRemove = Object.keys(allCookies).filter(key => key.startsWith(this.prefix))

      keysToRemove.forEach(key => {
        Cookies.remove(key)
      })
    } catch (error) {
      console.error('Cookie clear error:', error)
      throw new Error('Failed to clear cookies')
    }
  }

  public async getSize(): Promise<number> {
    try {
      const allCookies = Cookies.get()
      let size = 0

      Object.entries(allCookies).forEach(([key, value]) => {
        if (key.startsWith(this.prefix)) {
          // Estimate size (key + value + metadata)
          size += key.length + value.length + 50 // 50 bytes for cookie metadata
        }
      })

      return size
    } catch (error) {
      console.error('Cookie getSize error:', error)
      return 0
    }
  }

  public isAvailable(): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      const testKey = '__cookie_test__'
      Cookies.set(testKey, 'test')
      const testValue = Cookies.get(testKey)
      Cookies.remove(testKey)
      return testValue === 'test'
    } catch {
      return false
    }
  }

  private splitIntoChunks(str: string, chunkSize: number): string[] {
    const chunks: string[] = []
    let i = 0

    while (i < str.length) {
      chunks.push(str.slice(i, i + chunkSize))
      i += chunkSize
    }

    return chunks
  }

  public async getAllData(): Promise<Record<string, any>> {
    const result: Record<string, any> = {}
    const allCookies = Cookies.get()
    const processedKeys = new Set<string>()

    Object.keys(allCookies).forEach(cookieKey => {
      if (!cookieKey.startsWith(this.prefix)) {
        return
      }

      // Skip if it's a chunk or metadata cookie
      if (cookieKey.includes('_meta') || /_\d+$/.test(cookieKey)) {
        return
      }

      // Extract the original key
      const originalKey = cookieKey.replace(this.prefix, '')

      if (!processedKeys.has(originalKey)) {
        processedKeys.add(originalKey)

        try {
          // Use load method to handle both single and chunked cookies
          this.load(originalKey).then(data => {
            if (data) {
              result[originalKey] = data
            }
          })
        } catch {
          // Skip items that can't be parsed
        }
      }
    })

    return result
  }
}