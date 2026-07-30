import { describe, it, expect } from 'vitest'
import { compareResponses } from '../../src/diff/comparator'

describe('compareResponses', () => {
  it('marks identical responses as body identical', () => {
    const result = compareResponses({
      originalBody: '{"status":"ok"}',
      replayedBody: '{"status":"ok"}',
      originalLatencyMs: 100,
      replayedLatencyMs: 100,
    })
    expect(result.bodyIdentical).toBe(true)
    expect(result.bodyDiffSummary.added).toBe(0)
    expect(result.bodyDiffSummary.removed).toBe(0)
    expect(result.bodyDiffSummary.changed).toBe(0)
    expect(result.latencyDeltaMs).toBe(0)
  })

  it('marks different bodies as not identical', () => {
    const result = compareResponses({
      originalBody: '{"status":"ok"}',
      replayedBody: '{"status":"error"}',
      originalLatencyMs: 100,
      replayedLatencyMs: 200,
    })
    expect(result.bodyIdentical).toBe(false)
    expect(result.bodyDiffSummary.changed).toBe(1)
    expect(result.latencyDeltaMs).toBe(100)
  })

  it('handles null bodies', () => {
    const result = compareResponses({
      originalBody: null,
      replayedBody: null,
      originalLatencyMs: null,
      replayedLatencyMs: null,
    })
    expect(result.bodyIdentical).toBe(true)
    expect(result.latencyDeltaMs).toBeNull()
  })

  it('detects added fields', () => {
    const result = compareResponses({
      originalBody: '{"a":1}',
      replayedBody: '{"a":1,"b":2}',
      originalLatencyMs: 50,
      replayedLatencyMs: 50,
    })
    expect(result.bodyIdentical).toBe(false)
    expect(result.bodyDiffSummary.added).toBe(1)
  })

  it('detects removed fields', () => {
    const result = compareResponses({
      originalBody: '{"a":1,"b":2}',
      replayedBody: '{"a":1}',
      originalLatencyMs: null,
      replayedLatencyMs: 100,
    })
    expect(result.bodyIdentical).toBe(false)
    expect(result.bodyDiffSummary.removed).toBe(1)
  })
})
