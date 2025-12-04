/* eslint-disable no-console */
export async function computeHash(message: string): Promise<string> {
  // Check if crypto.subtle is available (Secure Context)
  if (crypto && crypto.subtle && crypto.subtle.digest) {
    try {
      const msgBuffer = new TextEncoder().encode(message)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      return hashHex
    } catch (e) {
      console.warn('[Hash] Crypto API failed, falling back to simple hash', e)
    }
  }

  // Fallback: Simple DJB2-like hash for insecure contexts
  // This is not cryptographically secure but sufficient for change detection
  let hash = 5381
  for (let i = 0; i < message.length; i++) {
    hash = (hash * 33) ^ message.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}
