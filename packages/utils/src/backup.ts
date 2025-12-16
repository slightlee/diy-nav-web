import { Website, BackupData } from '@nav/types'

/**
 * Supported input types for backup data cleaning
 */
type BackupInput =
  | BackupData
  | Partial<Website>[]
  | { websites: Partial<Website>[] }
  | null
  | undefined

/**
 * Clean data for semantic hashing.
 * Removes volatile fields (visitCount, lastVisited, etc.) from the data.
 * This ensures that the hash represents the structural content, not usage stats.
 *
 * @param data - Backup data in various formats (BackupData, Website[], or legacy format)
 * @returns Cleaned data with volatile fields removed
 */
export function cleanDataForHash(data: BackupInput): BackupInput {
  if (!data) return data

  // Legacy case: Array of websites
  if (Array.isArray(data)) {
    return cleanWebsites(data)
  }

  // Proper BackupData object
  if (isBackupData(data)) {
    // Optimization: Avoid JSON.parse(JSON.stringify) which is slow and memory intensive.
    // We use Shallow Copy + Map to achieve the same result efficiently.
    // Since cleanWebsites returns a NEW array with NEW objects, original websites are untouched.
    return {
      ...data,
      websites: data.websites ? cleanWebsites(data.websites) : []
    }
  }

  // Allow partial legacy structures (object with websites property)
  if ('websites' in data && Array.isArray(data.websites)) {
    return {
      ...data,
      websites: cleanWebsites(data.websites)
    }
  }

  return data
}

/**
 * Clean individual websites by removing volatile fields
 * @param websites - Array of website objects (partial or complete)
 * @returns Array of cleaned website objects
 */
function cleanWebsites(websites: Partial<Website>[]): Partial<Website>[] {
  return websites.map(w => ({
    ...w,
    // Explicitly clone array to detach from Vue Proxy for Worker compatibility
    tagIds: w.tagIds ? [...w.tagIds] : [],
    visitCount: 0,
    lastVisited: undefined,
    updatedAt: undefined,
    isOnline: true
  }))
}

/**
 * Type guard to check if data is a valid BackupData object
 * @param data - Unknown data to check
 * @returns True if data is BackupData with valid structure
 */
function isBackupData(data: unknown): data is BackupData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'websites' in data &&
    Array.isArray((data as BackupData).websites)
  )
}
