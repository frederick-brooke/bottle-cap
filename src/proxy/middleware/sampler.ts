import type { SamplerConfig } from '../types'

export function shouldSample(url: string, config: SamplerConfig): boolean {
  if (config.excludePatterns) {
    for (const pattern of config.excludePatterns) {
      if (pattern.test(url)) return false
    }
  }

  if (config.includePatterns) {
    for (const pattern of config.includePatterns) {
      if (pattern.test(url)) return true
    }
  }

  if (config.rate >= 1) return true
  if (config.rate <= 0) return false

  return Math.random() < config.rate
}
