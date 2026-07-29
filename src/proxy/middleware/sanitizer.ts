import type { SanitizerConfig } from '../types'
import { DEFAULT_STRIP_HEADERS } from '../types'

export function sanitizeHeaders(
  headers: Record<string, string>,
  config?: SanitizerConfig
): Record<string, string> {
  const stripList = config?.stripHeaders ?? DEFAULT_STRIP_HEADERS
  const normalized = stripList.map(h => h.toLowerCase())

  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (!normalized.includes(key.toLowerCase())) {
      result[key] = value
    }
  }
  return result
}
