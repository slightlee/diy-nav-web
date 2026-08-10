export interface AccountSessionContext {
  userId: string | null
  version: number
  signal: AbortSignal
}

let version = 0
let userId: string | null = null
let controller = new AbortController()

/**
 * Starts a new browser account session and cancels every request owned by the
 * previous one. This is the single account-switch boundary for the web app.
 */
export const beginAccountSession = (nextUserId?: string | null): AccountSessionContext => {
  controller.abort()
  controller = new AbortController()
  version += 1
  userId = nextUserId?.trim() || null
  return captureAccountSession()
}

export const captureAccountSession = (): AccountSessionContext => ({
  userId,
  version,
  signal: controller.signal
})

export const isCurrentAccountSession = (context: AccountSessionContext) =>
  context.version === version && context.userId === userId && !context.signal.aborted

export const isCurrentAccountSessionVersion = (
  expectedUserId: string | null,
  expectedVersion: number
) => expectedVersion === version && expectedUserId === userId && !controller.signal.aborted
