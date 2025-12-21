/**
 * Rate Limiter Service
 * Controls AI API usage per user
 */

import type { RateLimitConfig, RateLimitResult } from './types.js'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const DEFAULT_DAILY_LIMIT = 100

/**
 * In-memory rate limit storage
 * For production, consider using Redis or database
 */
const rateLimits: Map<string, RateLimitConfig> = new Map()

/**
 * Check if user can make an AI request
 * @param userId - User ID
 * @param dailyLimit - Optional custom daily limit
 * @returns Rate limit check result
 */
export function checkRateLimit(userId: string, dailyLimit?: number): RateLimitResult {
  const now = Date.now()
  let config = rateLimits.get(userId)

  // Initialize if not exists
  if (!config) {
    config = {
      userId,
      dailyLimit: dailyLimit ?? DEFAULT_DAILY_LIMIT,
      usedToday: 0,
      lastReset: now
    }
    rateLimits.set(userId, config)
  }

  // Reset if day has passed
  if (now - config.lastReset >= DAY_IN_MS) {
    config.usedToday = 0
    config.lastReset = now
  }

  // Update daily limit if provided
  if (dailyLimit !== undefined) {
    config.dailyLimit = dailyLimit
  }

  const remaining = Math.max(0, config.dailyLimit - config.usedToday)
  const resetAt = config.lastReset + DAY_IN_MS

  return {
    allowed: remaining > 0,
    remaining,
    resetAt
  }
}

/**
 * Consume one request from user's rate limit
 * @param userId - User ID
 * @returns true if request was allowed
 */
export function consumeRateLimit(userId: string): boolean {
  const result = checkRateLimit(userId)
  if (!result.allowed) {
    return false
  }

  const config = rateLimits.get(userId)
  if (config) {
    config.usedToday++
  }

  return true
}

/**
 * Get user's rate limit configuration
 * @param userId - User ID
 * @returns Rate limit config or undefined
 */
export function getRateLimitConfig(userId: string): RateLimitConfig | undefined {
  return rateLimits.get(userId)
}

/**
 * Set user's daily limit
 * @param userId - User ID
 * @param limit - New daily limit
 */
export function setDailyLimit(userId: string, limit: number): void {
  const config = rateLimits.get(userId)
  if (config) {
    config.dailyLimit = limit
  } else {
    rateLimits.set(userId, {
      userId,
      dailyLimit: limit,
      usedToday: 0,
      lastReset: Date.now()
    })
  }
}

/**
 * Reset user's usage counter
 * @param userId - User ID
 */
export function resetUsage(userId: string): void {
  const config = rateLimits.get(userId)
  if (config) {
    config.usedToday = 0
    config.lastReset = Date.now()
  }
}
