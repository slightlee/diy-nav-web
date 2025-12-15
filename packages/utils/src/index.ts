/**
 * Deterministic JSON Stringify
 * Sorts object keys recursively to ensure consistent hash generation
 */
export const stableStringify = (obj: unknown): string => {
  // Handle primitives
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj)
  }

  // Handle Arrays (preserve order)
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => stableStringify(item)).join(',') + ']'
  }

  // Handle Objects (sort keys)
  // We know obj is an object here due to previous checks
  const keys = Object.keys(obj as Record<string, unknown>).sort()
  const parts = keys.map(key => {
    const value = (obj as Record<string, unknown>)[key]
    return JSON.stringify(key) + ':' + stableStringify(value)
  })

  return '{' + parts.join(',') + '}'
}
