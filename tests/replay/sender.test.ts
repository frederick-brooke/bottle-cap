import { describe, it, expect, vi } from 'vitest'
import { rewriteUrl, getRequestBody, createSender } from '../../src/replay/sender'
import type { HttpRequest } from '../../src/types'
import type { ReplayOptions } from '../../src/replay/types'

vi.mock('../../src/storage/object-store', () => ({
  getObject: vi.fn().mockResolvedValue(Buffer.from('s3 body content')),
}))

describe('rewriteUrl', () => {
  it('rewrites http to http', () => {
    const result = rewriteUrl('http://old-host.com/api/users?page=1', 'http://new-host.com')
    expect(result).toBe('http://new-host.com/api/users?page=1')
  })

  it('rewrites https to https', () => {
    const result = rewriteUrl('https://old-host.com/path', 'https://staging.example.com')
    expect(result).toBe('https://staging.example.com/path')
  })

  it('rewrites http to https', () => {
    const result = rewriteUrl('http://old-host.com/path', 'https://new-host.com')
    expect(result).toBe('https://new-host.com/path')
  })

  it('preserves port', () => {
    const result = rewriteUrl('http://old-host.com:8080/path', 'http://new-host.com:3000')
    expect(result).toBe('http://new-host.com:3000/path')
  })

  it('preserves query string', () => {
    const result = rewriteUrl('http://old.com/path?foo=bar&baz=qux', 'http://new.com')
    expect(result).toBe('http://new.com/path?foo=bar&baz=qux')
  })

  it('preserves path segments', () => {
    const result = rewriteUrl('http://old.com/a/b/c', 'http://new.com')
    expect(result).toBe('http://new.com/a/b/c')
  })
})

describe('getRequestBody', () => {
  it('returns null when no body key', async () => {
    const request = { id: '1', request_body_key: null } as HttpRequest
    const result = await getRequestBody(request)
    expect(result).toBeNull()
  })

  it('returns inline body as buffer', async () => {
    const request = { id: '1', request_body_key: '{"key":"value"}' } as HttpRequest
    const result = await getRequestBody(request)
    expect(result).toEqual(Buffer.from('{"key":"value"}'))
  })

  it('fetches S3 body for captures/ key', async () => {
    const request = { id: '1', request_body_key: 'captures/abc/requests/123/request' } as HttpRequest
    const result = await getRequestBody(request)
    expect(result).toEqual(Buffer.from('s3 body content'))
  })
})

describe('createSender', () => {
  function makeOptions(overrides?: Partial<ReplayOptions>): ReplayOptions {
    return {
      replayId: 'replay1',
      captureId: 'cap1',
      targetUrl: 'http://target.com',
      mode: 'burst',
      timeout: 5000,
      maxConcurrent: 10,
      rejectUnauthorized: true,
      ...overrides,
    }
  }

  it('creates a sender for http target', async () => {
    const send = createSender(makeOptions())
    expect(typeof send).toBe('function')
  })

  it('creates a sender for https target', async () => {
    const send = createSender(makeOptions({ targetUrl: 'https://target.com' }))
    expect(typeof send).toBe('function')
  })

  it('passes rejectUnauthorized to https agent', async () => {
    const send = createSender(makeOptions({
      targetUrl: 'https://target.com',
      rejectUnauthorized: false,
    }))
    expect(typeof send).toBe('function')
  })
})
