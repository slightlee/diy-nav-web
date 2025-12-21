/**
 * Usage Tracker Service
 * Tracks AI API usage per user for analytics
 */

import type { UsageRecord, UsageStats } from './types.js'

const DAY_IN_MS = 24 * 60 * 60 * 1000

/**
 * In-memory usage storage
 * For production, this should be stored in database
 */
const usageRecords: UsageRecord[] = []
let nextId = 1

/**
 * Record an AI usage event
 * @param userId - User ID
 * @param providerId - Provider ID used
 * @param action - Action type
 * @param tokensUsed - Number of tokens consumed
 */
export function recordUsage(
  userId: string,
  providerId: string,
  action: 'chat' | 'generate_description',
  tokensUsed: number
): void {
  usageRecords.push({
    id: nextId++,
    userId,
    providerId,
    action,
    tokensUsed,
    createdAt: Date.now()
  })
}

/**
 * Get usage statistics for a user
 * @param userId - User ID
 * @returns Usage statistics
 */
export function getUserStats(userId: string): UsageStats {
  const now = Date.now()
  const dayStart = now - DAY_IN_MS
  const userRecords = usageRecords.filter(r => r.userId === userId)
  const todayRecords = userRecords.filter(r => r.createdAt >= dayStart)

  return {
    totalTokens: userRecords.reduce((sum, r) => sum + r.tokensUsed, 0),
    totalRequests: userRecords.length,
    todayTokens: todayRecords.reduce((sum, r) => sum + r.tokensUsed, 0),
    todayRequests: todayRecords.length
  }
}

/**
 * Get usage records for a user within a time range
 * @param userId - User ID
 * @param startTime - Start timestamp
 * @param endTime - End timestamp
 * @returns Array of usage records
 */
export function getUserRecords(
  userId: string,
  startTime?: number,
  endTime?: number
): UsageRecord[] {
  return usageRecords.filter(r => {
    if (r.userId !== userId) return false
    if (startTime && r.createdAt < startTime) return false
    if (endTime && r.createdAt > endTime) return false
    return true
  })
}

/**
 * Clear old usage records (for cleanup)
 * @param maxAge - Maximum age in milliseconds
 */
export function clearOldRecords(maxAge: number): number {
  const cutoff = Date.now() - maxAge
  const initialLength = usageRecords.length

  // Filter in place
  let writeIndex = 0
  for (let readIndex = 0; readIndex < usageRecords.length; readIndex++) {
    if (usageRecords[readIndex].createdAt >= cutoff) {
      usageRecords[writeIndex] = usageRecords[readIndex]
      writeIndex++
    }
  }
  usageRecords.length = writeIndex

  return initialLength - usageRecords.length
}
