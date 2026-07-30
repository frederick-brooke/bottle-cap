import { describe, it, expect } from 'vitest'
import { diffBody } from '../../src/diff/body-diff'

describe('diffBody', () => {
  it('returns no diff for both null', () => {
    const result = diffBody(null, null)
    expect(result.added).toBe(0)
    expect(result.removed).toBe(0)
    expect(result.changed).toBe(0)
    expect(result.details).toHaveLength(0)
  })

  it('detects added body', () => {
    const result = diffBody(null, '{"key":"value"}')
    expect(result.changed).toBe(1)
    expect(result.details[0].kind).toBe('edited')
    expect(result.details[0].lhs).toBeNull()
    expect(result.details[0].rhs).toBe('{"key":"value"}')
  })

  it('detects removed body', () => {
    const result = diffBody('{"key":"value"}', null)
    expect(result.changed).toBe(1)
    expect(result.details[0].kind).toBe('edited')
    expect(result.details[0].lhs).toBe('{"key":"value"}')
    expect(result.details[0].rhs).toBeNull()
  })

  it('returns no diff for identical JSON', () => {
    const body = '{"name":"test","count":42}'
    const result = diffBody(body, body)
    expect(result.added).toBe(0)
    expect(result.removed).toBe(0)
    expect(result.changed).toBe(0)
  })

  it('detects added JSON fields', () => {
    const result = diffBody('{"a":1}', '{"a":1,"b":2}')
    expect(result.added).toBe(1)
    expect(result.details[0]).toEqual({
      path: 'b',
      kind: 'added',
      rhs: 2,
    })
  })

  it('detects removed JSON fields', () => {
    const result = diffBody('{"a":1,"b":2}', '{"a":1}')
    expect(result.removed).toBe(1)
    expect(result.details[0]).toEqual({
      path: 'b',
      kind: 'removed',
      lhs: 2,
    })
  })

  it('detects changed JSON values', () => {
    const result = diffBody('{"a":1}', '{"a":2}')
    expect(result.changed).toBe(1)
    expect(result.details[0]).toEqual({
      path: 'a',
      kind: 'edited',
      lhs: 1,
      rhs: 2,
    })
  })

  it('detects nested changes', () => {
    const result = diffBody(
      '{"user":{"name":"Alice","age":30}}',
      '{"user":{"name":"Alice","age":31}}',
    )
    expect(result.changed).toBe(1)
    expect(result.details[0].path).toBe('user.age')
    expect(result.details[0].lhs).toBe(30)
    expect(result.details[0].rhs).toBe(31)
  })

  it('detects array changes', () => {
    const result = diffBody('[1,2,3]', '[1,2,4]')
    expect(result.changed).toBe(1)
    expect(result.details[0].path).toBe('2')
    expect(result.details[0].lhs).toBe(3)
    expect(result.details[0].rhs).toBe(4)
  })

  it('detects array length changes', () => {
    const result = diffBody('[1,2]', '[1,2,3]')
    expect(result.added).toBe(1)
    expect(result.details[0].path).toBe('2')
    expect(result.details[0].kind).toBe('added')
  })

  it('falls back to string comparison for non-JSON', () => {
    const result = diffBody('hello', 'hello')
    expect(result.changed).toBe(0)
    expect(result.details).toHaveLength(0)
  })

  it('detects different non-JSON strings', () => {
    const result = diffBody('hello', 'world')
    expect(result.changed).toBe(1)
    expect(result.details[0].lhs).toBe('hello')
    expect(result.details[0].rhs).toBe('world')
  })

  it('handles mixed valid/invalid JSON', () => {
    const result = diffBody('{"a":1}', 'not json')
    expect(result.changed).toBe(1)
  })

  it('handles deeply nested objects without stack overflow', () => {
    let deep1: Record<string, unknown> = { value: 'original' }
    let deep2: Record<string, unknown> = { value: 'changed' }
    for (let i = 0; i < 100; i++) {
      deep1 = { nested: deep1 }
      deep2 = { nested: deep2 }
    }
    const result = diffBody(JSON.stringify(deep1), JSON.stringify(deep2))
    expect(result.changed).toBeGreaterThanOrEqual(1)
  })

  it('respects maxDepth parameter', () => {
    const original = JSON.stringify({ a: { b: { c: { d: 'original' } } } })
    const replayed = JSON.stringify({ a: { b: { c: { d: 'changed' } } } })
    const result = diffBody(original, replayed, 2)
    expect(result.changed).toBe(1)
    expect(result.details[0].path).toBe('a.b')
    expect(result.details[0].kind).toBe('edited')
  })

  it('detects changes within maxDepth', () => {
    const original = JSON.stringify({ a: { b: 1 } })
    const replayed = JSON.stringify({ a: { b: 2 } })
    const result = diffBody(original, replayed, 64)
    expect(result.changed).toBe(1)
    expect(result.details[0].path).toBe('a.b')
  })

  it('does not false-positive on identical objects at maxDepth', () => {
    const original = JSON.stringify({ a: { b: { c: { d: 1 } } } })
    const replayed = JSON.stringify({ a: { b: { c: { d: 1 } } } })
    const result = diffBody(original, replayed, 2)
    expect(result.changed).toBe(0)
    expect(result.added).toBe(0)
    expect(result.removed).toBe(0)
  })
})
