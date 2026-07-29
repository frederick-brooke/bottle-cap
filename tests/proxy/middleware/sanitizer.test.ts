import { describe, it, expect } from 'vitest'
import { sanitizeHeaders } from '../../../src/proxy/middleware/sanitizer'

describe('sanitizer', () => {
  it('should strip Authorization header', () => {
    const headers = {
      'content-type': 'application/json',
      'authorization': 'Bearer token123',
    }
    const result = sanitizeHeaders(headers)
    expect(result.authorization).toBeUndefined()
    expect(result['content-type']).toBe('application/json')
  })

  it('should strip Cookie header', () => {
    const headers = {
      'cookie': 'session=abc123',
      'accept': '*/*',
    }
    const result = sanitizeHeaders(headers)
    expect(result.cookie).toBeUndefined()
    expect(result.accept).toBe('*/*')
  })

  it('should strip Set-Cookie header', () => {
    const headers = {
      'set-cookie': 'session=abc123; Path=/',
      'content-type': 'text/html',
    }
    const result = sanitizeHeaders(headers)
    expect(result['set-cookie']).toBeUndefined()
    expect(result['content-type']).toBe('text/html')
  })

  it('should strip custom headers via config', () => {
    const headers = {
      'x-custom-secret': 'secret-value',
      'x-request-id': 'req-123',
    }
    const result = sanitizeHeaders(headers, {
      stripHeaders: ['x-custom-secret'],
    })
    expect(result['x-custom-secret']).toBeUndefined()
    expect(result['x-request-id']).toBe('req-123')
  })

  it('should return all non-sensitive headers unchanged', () => {
    const headers = {
      'content-type': 'application/json',
      'accept': 'application/json',
      'x-request-id': 'req-123',
      'user-agent': 'test-agent',
    }
    const result = sanitizeHeaders(headers)
    expect(Object.keys(result)).toHaveLength(4)
    expect(result).toEqual(headers)
  })

  it('should handle empty headers', () => {
    const result = sanitizeHeaders({})
    expect(result).toEqual({})
  })

  it('should be case-insensitive for header matching', () => {
    const headers = {
      'Authorization': 'Bearer token',
      'COOKIE': 'session=abc',
      'Set-Cookie': 'a=b',
    }
    const result = sanitizeHeaders(headers)
    expect(result['Authorization']).toBeUndefined()
    expect(result['COOKIE']).toBeUndefined()
    expect(result['Set-Cookie']).toBeUndefined()
  })
})
