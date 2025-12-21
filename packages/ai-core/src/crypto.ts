/**
 * AES-256-GCM Encryption Utilities
 * Industry-standard encryption for API keys
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32
const KEY_LENGTH = 32

/**
 * Derive a 256-bit key from a password using scrypt
 * @param password - Secret password (e.g., JWT_SECRET)
 * @param salt - Salt for key derivation
 * @returns 256-bit encryption key
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH)
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param plaintext - Text to encrypt (e.g., API key)
 * @param secret - Secret for key derivation (e.g., JWT_SECRET)
 * @returns Encrypted string in format: salt:iv:authTag:ciphertext (base64)
 */
export function encrypt(plaintext: string, secret: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(secret, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Combine: salt + iv + authTag + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * @param encryptedData - Encrypted data in base64 format
 * @param secret - Secret for key derivation (must match encryption secret)
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string, secret: string): string {
  const combined = Buffer.from(encryptedData, 'base64')

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  )
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

  const key = deriveKey(secret, salt)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

/**
 * Verify if encrypted data can be decrypted with given secret
 * @param encryptedData - Encrypted data to verify
 * @param secret - Secret to test
 * @returns true if decryption succeeds
 */
export function verifyEncryption(encryptedData: string, secret: string): boolean {
  try {
    decrypt(encryptedData, secret)
    return true
  } catch {
    return false
  }
}
