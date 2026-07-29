import { describe, it, expect } from 'vitest'
import { shouldSample } from '../../../src/proxy/middleware/sampler'
import type { SamplerConfig } from '../../../src/proxy/types'

describe('sampler', () => {
  it('should always sample when rate = 1.0', () => {
    for (let i = 0; i < 100; i++) {
      expect(shouldSample('/api/test', { rate: 1.0 })).toBe(true)
    }
  })

  it('should never sample when rate = 0.0', () => {
    for (let i = 0; i < 100; i++) {
      expect(shouldSample('/api/test', { rate: 0.0 })).toBe(false)
    }
  })

  it('should sample approximately half when rate = 0.5', () => {
    let sampled = 0
    const iterations = 1000
    for (let i = 0; i < iterations; i++) {
      if (shouldSample('/api/test', { rate: 0.5 })) sampled++
    }
    expect(sampled).toBeGreaterThan(350)
    expect(sampled).toBeLessThan(650)
  })

  it('should return true for URL matching include pattern', () => {
    const config: SamplerConfig = {
      rate: 0.0,
      includePatterns: [/^\/api\/v1/],
    }
    expect(shouldSample('/api/v1/users', config)).toBe(true)
  })

  it('should return false for URL matching exclude pattern', () => {
    const config: SamplerConfig = {
      rate: 1.0,
      excludePatterns: [/\/health/],
    }
    expect(shouldSample('/health', config)).toBe(false)
    expect(shouldSample('/api/health/check', config)).toBe(false)
  })

  it('should let exclude take precedence over include', () => {
    const config: SamplerConfig = {
      rate: 0.0,
      includePatterns: [/^\/api/],
      excludePatterns: [/\/internal/],
    }
    expect(shouldSample('/api/users', config)).toBe(true)
    expect(shouldSample('/api/internal/users', config)).toBe(false)
  })

  it('should handle empty pattern arrays', () => {
    const config: SamplerConfig = {
      rate: 0.5,
      includePatterns: [],
      excludePatterns: [],
    }
    let sampled = 0
    for (let i = 0; i < 100; i++) {
      if (shouldSample('/test', config)) sampled++
    }
    expect(sampled).toBeGreaterThan(0)
    expect(sampled).toBeLessThan(100)
  })
})
