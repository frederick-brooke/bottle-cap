import { describe, it, expect } from 'vitest'
import { analyzeLatency } from '../../src/diff/latency-diff'

describe('analyzeLatency', () => {
  it('returns null when original is null', () => {
    expect(analyzeLatency(null, 100)).toBeNull()
  })

  it('returns null when replayed is null', () => {
    expect(analyzeLatency(100, null)).toBeNull()
  })

  it('returns null when both are null', () => {
    expect(analyzeLatency(null, null)).toBeNull()
  })

  it('computes delta for same latency', () => {
    const result = analyzeLatency(100, 100)!
    expect(result.deltaMs).toBe(0)
    expect(result.percentageChange).toBe(0)
  })

  it('computes positive delta for slower replay', () => {
    const result = analyzeLatency(100, 150)!
    expect(result.deltaMs).toBe(50)
    expect(result.percentageChange).toBe(50)
  })

  it('computes negative delta for faster replay', () => {
    const result = analyzeLatency(200, 100)!
    expect(result.deltaMs).toBe(-100)
    expect(result.percentageChange).toBe(-50)
  })

  it('handles zero original latency', () => {
    const result = analyzeLatency(0, 50)!
    expect(result.deltaMs).toBe(50)
    expect(result.percentageChange).toBe(100)
  })

  it('handles both zero latencies', () => {
    const result = analyzeLatency(0, 0)!
    expect(result.deltaMs).toBe(0)
    expect(result.percentageChange).toBe(0)
  })

  it('rounds percentage to 2 decimal places', () => {
    const result = analyzeLatency(300, 400)!
    expect(result.percentageChange).toBe(33.33)
  })

  it('returns null when original is NaN', () => {
    expect(analyzeLatency(NaN, 100)).toBeNull()
  })

  it('returns null when replayed is NaN', () => {
    expect(analyzeLatency(100, NaN)).toBeNull()
  })

  it('returns null when both are NaN', () => {
    expect(analyzeLatency(NaN, NaN)).toBeNull()
  })

  it('handles negative latency values', () => {
    const result = analyzeLatency(-50, 100)!
    expect(result.deltaMs).toBe(150)
    expect(result.percentageChange).toBe(-300)
  })

  it('returns null when original is Infinity', () => {
    expect(analyzeLatency(Infinity, 100)).toBeNull()
  })

  it('returns null when replayed is Infinity', () => {
    expect(analyzeLatency(100, Infinity)).toBeNull()
  })

  it('returns null when original is -Infinity', () => {
    expect(analyzeLatency(-Infinity, 100)).toBeNull()
  })
})
