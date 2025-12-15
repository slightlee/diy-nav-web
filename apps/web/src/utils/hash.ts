import { logger } from '@nav/logger'
import MD5 from 'crypto-js/md5'
import { stableStringify } from '@nav/utils'
import HashWorker from '@/workers/hash.worker?worker'

export function computeMd5(message: string): string {
  try {
    return MD5(message).toString()
  } catch (e) {
    logger.error({ err: e }, '[Hash] MD5 calculation failed')
    return ''
  }
}

// Singleton worker instance
let worker: Worker | null = null

export function computeCanonicalHash(obj: unknown): Promise<string> {
  return new Promise(resolve => {
    try {
      if (!worker) {
        worker = new HashWorker()
      }

      worker.onmessage = e => {
        if (e.data.success) {
          resolve(e.data.hash)
        } else {
          logger.error({ err: e.data.error }, '[Hash] Worker calculation failed')
          // Fallback to main thread if worker fails?
          // For now, reject or fallback. Let's fallback to sync for robustness.
          // Fallback logic:
          resolve(computeSyncCanonicalHash(obj))
        }
      }

      worker.onerror = err => {
        logger.error({ err }, '[Hash] Worker error')
        resolve(computeSyncCanonicalHash(obj))
      }

      worker.postMessage(obj)
    } catch (e) {
      logger.error({ err: e }, '[Hash] Failed to dispatch to worker')
      resolve(computeSyncCanonicalHash(obj))
    }
  })
}

// Sync fallback (and for internal use if needed)
export function computeSyncCanonicalHash(obj: unknown): string {
  try {
    const message = stableStringify(obj)
    return computeMd5(message)
  } catch (e) {
    logger.error({ err: e }, '[Hash] Canonical Hash calculation failed')
    return ''
  }
}
