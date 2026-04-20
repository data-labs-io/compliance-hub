/**
 * Token Storage for IP Fabric Extension
 *
 * Provides secure storage for API tokens in extension mode
 * Uses file-based storage with encryption
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'

// Storage location - use /tmp for Docker compatibility
const STORAGE_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/.extension-data'  // Docker container writable location
  : path.join(process.cwd(), '.extension-data')  // Local development

const TOKEN_FILE = path.join(STORAGE_DIR, 'token.enc')

// Simple encryption key (in production, use a proper key management system)
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'ipfabric-extension-default-key-change-in-production'

/**
 * Ensure storage directory exists
 */
function ensureStorageDir(): void {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      console.error('[token-storage] Creating storage directory:', STORAGE_DIR)
      fs.mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o755 })
      console.error('[token-storage] Storage directory created successfully')
    }
  } catch (error) {
    console.error('[token-storage] CRITICAL: Failed to create storage directory:', STORAGE_DIR)
    console.error('[token-storage] Error details:', {
      error: error instanceof Error ? error.message : String(error),
      platform: os.platform(),
      tmpDir: os.tmpdir(),
      cwd: process.cwd()
    })
    throw error
  }
}

/**
 * Encrypt data
 */
function encrypt(text: string): string {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  // Return iv + encrypted data
  return iv.toString('hex') + ':' + encrypted
}

/**
 * Decrypt data
 */
function decrypt(encryptedData: string): string {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()
  const parts = encryptedData.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Save token to secure storage
 */
export function saveToken(token: string): boolean {
  try {
    // Server-side only
    if (typeof window !== 'undefined') {
      console.error('saveToken called on client-side')
      return false
    }

    ensureStorageDir()

    const encrypted = encrypt(token)

    fs.writeFileSync(TOKEN_FILE, encrypted, { mode: 0o644 })

    // Verify the file was written
    if (fs.existsSync(TOKEN_FILE)) {
      return true
    } else {
      console.error('Token file was not created')
      return false
    }
  } catch (error) {
    console.error('Error saving token:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return false
  }
}

/**
 * Get stored token
 */
export function getStoredToken(): string | null {
  try {
    // Server-side only
    if (typeof window !== 'undefined') {
      return null
    }

    if (!fs.existsSync(TOKEN_FILE)) {
      return null
    }

    const encrypted = fs.readFileSync(TOKEN_FILE, 'utf8')
    const token = decrypt(encrypted)

    return token
  } catch (error) {
    console.error('Error reading token:', error)
    return null
  }
}

/**
 * Check if token exists
 */
export function hasStoredToken(): boolean {
  // Server-side only
  if (typeof window !== 'undefined') {
    return false
  }

  return fs.existsSync(TOKEN_FILE)
}

/**
 * Delete stored token
 */
export function deleteToken(): boolean {
  try {
    // Server-side only
    if (typeof window !== 'undefined') {
      console.error('deleteToken called on client-side')
      return false
    }

    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE)
    }

    return true
  } catch (error) {
    console.error('Error deleting token:', error)
    return false
  }
}
