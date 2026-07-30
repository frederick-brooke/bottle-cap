import { describe, it, expect } from 'vitest'
import {
  formatMode,
  formatStatusBadge,
  formatStatusCode,
  formatLatencyDelta,
  formatJson,
  formatTable,
} from '../../src/cli/utils/format'

describe('formatMode', () => {
  it('returns colored mode name for paced', () => {
    const result = formatMode('paced')
    expect(result).toContain('paced')
  })

  it('returns colored mode name for burst', () => {
    const result = formatMode('burst')
    expect(result).toContain('burst')
  })

  it('returns colored mode name for throttled', () => {
    const result = formatMode('throttled')
    expect(result).toContain('throttled')
  })

  it('returns raw string for unknown mode', () => {
    const result = formatMode('unknown')
    expect(result).toBe('unknown')
  })
})

describe('formatStatusBadge', () => {
  it('returns badge for active status', () => {
    const result = formatStatusBadge('active')
    expect(result).toContain('active')
  })

  it('returns badge for completed status', () => {
    const result = formatStatusBadge('completed')
    expect(result).toContain('completed')
  })

  it('returns badge for running status', () => {
    const result = formatStatusBadge('running')
    expect(result).toContain('running')
  })

  it('returns badge for failed status', () => {
    const result = formatStatusBadge('failed')
    expect(result).toContain('failed')
  })

  it('returns badge for pending status', () => {
    const result = formatStatusBadge('pending')
    expect(result).toContain('pending')
  })
})

describe('formatStatusCode', () => {
  it('formats 2xx as green', () => {
    const result = formatStatusCode(200)
    expect(result).toContain('200')
  })

  it('formats 3xx as cyan', () => {
    const result = formatStatusCode(301)
    expect(result).toContain('301')
  })

  it('formats 4xx as yellow', () => {
    const result = formatStatusCode(404)
    expect(result).toContain('404')
  })

  it('formats 5xx as red', () => {
    const result = formatStatusCode(500)
    expect(result).toContain('500')
  })

  it('formats null as ???', () => {
    const result = formatStatusCode(null)
    expect(result).toContain('???')
  })
})

describe('formatLatencyDelta', () => {
  it('formats equal latencies', () => {
    const result = formatLatencyDelta(100, 100)
    expect(result).toContain('100.0ms')
    expect(result).toContain('+0.0ms')
  })

  it('formats positive delta', () => {
    const result = formatLatencyDelta(100, 150)
    expect(result).toContain('150.0ms')
    expect(result).toContain('+50.0ms')
  })

  it('formats negative delta', () => {
    const result = formatLatencyDelta(200, 100)
    expect(result).toContain('100.0ms')
    expect(result).toContain('-100.0ms')
  })

  it('formats null values as N/A', () => {
    const result = formatLatencyDelta(null, 100)
    expect(result).toContain('N/A')
  })
})

describe('formatJson', () => {
  it('formats object as pretty JSON', () => {
    const result = formatJson({ key: 'value', num: 42 })
    const parsed = JSON.parse(result)
    expect(parsed.key).toBe('value')
    expect(parsed.num).toBe(42)
  })

  it('formats array as pretty JSON', () => {
    const result = formatJson([1, 2, 3])
    const parsed = JSON.parse(result)
    expect(parsed).toEqual([1, 2, 3])
  })
})

describe('formatTable', () => {
  it('formats table with headers and rows', () => {
    const result = formatTable(['Name', 'Status'], [['foo', 'active'], ['bar', 'inactive']])
    expect(result).toContain('Name')
    expect(result).toContain('Status')
    expect(result).toContain('foo')
    expect(result).toContain('bar')
    expect(result).toContain('active')
    expect(result).toContain('inactive')
  })

  it('handles empty rows', () => {
    const result = formatTable(['Name', 'Status'], [])
    expect(result).toContain('Name')
    expect(result).toContain('Status')
  })

  it('pads columns correctly', () => {
    const result = formatTable(['A', 'BB'], [['xxx', 'yyyy']])
    expect(result).toContain('xxx')
    expect(result).toContain('yyyy')
  })
})
