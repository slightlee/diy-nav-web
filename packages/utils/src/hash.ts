import CryptoJS from 'crypto-js'
import { logger } from '@nav/logger'
import { stableStringify } from './index.js'

/**
 * Compute MD5 hash of a string message
 * @param message - String to hash
 * @returns MD5 hash in hexadecimal format, or empty string on error
 * @throws Never throws - returns empty string as fallback
 */
export function computeMd5(message: string): string {
  try {
    return CryptoJS.MD5(message).toString()
  } catch (error) {
    // Fallback to empty string on error
    // Note: This should rarely happen unless CryptoJS fails
    logger.error({ err: error, message }, '[Hash] MD5 computation failed')
    return ''
  }
}

/**
 * Compute canonical hash of an object
 * Uses stable stringify to ensure consistent ordering of object keys
 * @param obj - Object to hash
 * @returns MD5 hash of the canonicalized object, or empty string on error
 */
export function computeHash(obj: unknown): string {
  try {
    const message = stableStringify(obj)
    return computeMd5(message)
  } catch (error) {
    // Fallback to empty string on error
    logger.error({ err: error }, '[Hash] Object hash computation failed')
    return ''
  }
}
