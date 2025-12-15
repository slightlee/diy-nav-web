/**
 * Global Frontend Configuration
 * Centralizes environment variables and hardcoded constants.
 */

export const BACKUP_CONFIG = {
  /**
   * Safe Auto-Backup Interval (ms)
   * Controlled by VITE_AUTO_BACKUP_INTERVAL. Default: 1 hour (3600000ms).
   */
  INTERVAL: Number(import.meta.env.VITE_AUTO_BACKUP_INTERVAL) || 60 * 60 * 1000,

  /**
   * Lock Duration (ms)
   * How long a backup lock remains valid before being considered stale.
   */
  LOCK_DURATION: 2 * 60 * 1000, // 2 minutes

  /**
   * Initial Delay (ms)
   * How long to wait after app launch before first check.
   */
  INITIAL_DELAY: 3000
} as const
