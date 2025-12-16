import { logger } from '@nav/logger'
import { computeHash } from '@nav/utils'
import HashWorker from '@/workers/hash.worker?worker'

export const computeSyncCanonicalHash = computeHash

export function computeCanonicalHash(obj: unknown): Promise<string> {
  return new Promise(resolve => {
    // Create a fresh worker for each task to avoid race conditions with singleton onmessage
    const worker = new HashWorker()

    const cleanup = () => {
      worker.terminate()
    }

    worker.onmessage = e => {
      cleanup()
      if (e.data.success) {
        resolve(e.data.hash)
      } else {
        logger.error({ err: e.data.error }, '[Hash] Worker calculation failed')
        resolve(computeSyncCanonicalHash(obj))
      }
    }

    worker.onerror = err => {
      cleanup()
      logger.error({ err }, '[Hash] Worker error')
      resolve(computeSyncCanonicalHash(obj))
    }

    try {
      worker.postMessage(obj)
    } catch (e) {
      cleanup()
      logger.error({ err: e }, '[Hash] Failed to dispatch to worker')
      resolve(computeSyncCanonicalHash(obj))
    }
  })
}

// End of file
