import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { getDatabase, runMigrations } from '../../src/storage/database'
import { insertHttpRequest } from '../../src/proxy/capture'
import type { CapturedBody } from '../../src/proxy/types'

let db: Database.Database

beforeAll(() => {
  db = getDatabase()
  runMigrations()
})

beforeEach(() => {
  db.exec('DELETE FROM replay_results')
  db.exec('DELETE FROM replays')
  db.exec('DELETE FROM http_requests')
  db.exec('DELETE FROM captures')
})

function createCapture(serviceName: string): string {
  const id = `test-cap-${Date.now()}-${Math.random().toString(36).slice(2)}`
  db.prepare(`INSERT INTO captures (id, service_name, target_url) VALUES (?, ?, ?)`).run(id, serviceName, 'http://localhost')
  return id
}

describe('insertHttpRequest', () => {
  it('should insert a basic GET request', () => {
    const captureId = createCapture('svc')
    const requestId = insertHttpRequest({
      captureId,
      method: 'GET',
      url: '/api/users',
      headers: { 'accept': 'application/json' },
      requestBody: null,
      statusCode: 200,
      responseHeaders: { 'content-type': 'application/json' },
      responseBody: null,
      latencyMs: 45,
      serviceVersion: null,
      traceId: null,
      recordedAt: new Date().toISOString(),
      db,
    })

    expect(requestId).toBeDefined()

    const row = db.prepare('SELECT * FROM http_requests WHERE id = ?').get(requestId) as Record<string, unknown>
    expect(row.method).toBe('GET')
    expect(row.url).toBe('/api/users')
    expect(row.status_code).toBe(200)
    expect(row.latency_ms).toBe(45)
    expect(row.request_body_key).toBeNull()
    expect(row.response_body_key).toBeNull()
  })

  it('should increment capture request count', () => {
    const captureId = createCapture('svc')
    insertHttpRequest({
      captureId,
      method: 'GET',
      url: '/test',
      headers: {},
      requestBody: null,
      statusCode: 200,
      responseHeaders: null,
      responseBody: null,
      latencyMs: 10,
      serviceVersion: null,
      traceId: null,
      recordedAt: new Date().toISOString(),
      db,
    })

    const row = db.prepare('SELECT request_count FROM captures WHERE id = ?').get(captureId) as Record<string, unknown>
    expect(row.request_count).toBe(1)
  })

  it('should store inline request body when small', () => {
    const captureId = createCapture('svc')
    const body: CapturedBody = {
      buffer: Buffer.from('{"name":"test"}'),
      preview: '{"name":"test"}',
      s3Key: null,
    }

    insertHttpRequest({
      captureId,
      method: 'POST',
      url: '/api/users',
      headers: { 'content-type': 'application/json' },
      requestBody: body,
      statusCode: 201,
      responseHeaders: null,
      responseBody: null,
      latencyMs: 120,
      serviceVersion: null,
      traceId: null,
      recordedAt: new Date().toISOString(),
      db,
    })

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    expect(row.request_body_key).toBe('{"name":"test"}')
    expect(row.request_body_preview).toBe('{"name":"test"}')
  })

  it('should store S3 key when body has s3Key', () => {
    const captureId = createCapture('svc')
    const body: CapturedBody = {
      buffer: Buffer.from('large body'),
      preview: 'large body',
      s3Key: 'captures/abc/requests/def/request',
    }

    insertHttpRequest({
      captureId,
      method: 'POST',
      url: '/api/data',
      headers: {},
      requestBody: body,
      statusCode: 200,
      responseHeaders: null,
      responseBody: null,
      latencyMs: 50,
      serviceVersion: null,
      traceId: null,
      recordedAt: new Date().toISOString(),
      db,
    })

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    expect(row.request_body_key).toBe('captures/abc/requests/def/request')
  })

  it('should store response body', () => {
    const captureId = createCapture('svc')
    const responseBody: CapturedBody = {
      buffer: Buffer.from('{"id":1,"name":"test"}'),
      preview: '{"id":1,"name":"test"}',
      s3Key: null,
    }

    insertHttpRequest({
      captureId,
      method: 'GET',
      url: '/api/users/1',
      headers: {},
      requestBody: null,
      statusCode: 200,
      responseHeaders: { 'content-type': 'application/json' },
      responseBody,
      latencyMs: 30,
      serviceVersion: null,
      traceId: null,
      recordedAt: new Date().toISOString(),
      db,
    })

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    expect(row.response_body_key).toBe('{"id":1,"name":"test"}')
    expect(row.response_body_preview).toBe('{"id":1,"name":"test"}')
  })

  it('should store response headers as JSON', () => {
    const captureId = createCapture('svc')
    insertHttpRequest({
      captureId,
      method: 'GET',
      url: '/test',
      headers: {},
      requestBody: null,
      statusCode: 200,
      responseHeaders: { 'content-type': 'text/plain', 'x-custom': 'value' },
      responseBody: null,
      latencyMs: 10,
      serviceVersion: null,
      traceId: null,
      recordedAt: new Date().toISOString(),
      db,
    })

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    const storedHeaders = JSON.parse(row.response_headers as string)
    expect(storedHeaders['content-type']).toBe('text/plain')
    expect(storedHeaders['x-custom']).toBe('value')
  })

  it('should handle null status code', () => {
    const captureId = createCapture('svc')
    insertHttpRequest({
      captureId,
      method: 'GET',
      url: '/test',
      headers: {},
      requestBody: null,
      statusCode: null,
      responseHeaders: null,
      responseBody: null,
      latencyMs: null,
      serviceVersion: null,
      traceId: null,
      recordedAt: new Date().toISOString(),
      db,
    })

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    expect(row.status_code).toBeNull()
    expect(row.latency_ms).toBeNull()
  })

  it('should store service version when provided', () => {
    const captureId = createCapture('svc')
    insertHttpRequest({
      captureId,
      method: 'GET',
      url: '/test',
      headers: {},
      requestBody: null,
      statusCode: 200,
      responseHeaders: null,
      responseBody: null,
      latencyMs: 10,
      traceId: null,
      serviceVersion: 'v1.2.3',
      recordedAt: new Date().toISOString(),
      db,
    })

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    expect(row.service_version).toBe('v1.2.3')
  })

  it('should store trace id when provided', () => {
    const captureId = createCapture('svc')
    insertHttpRequest({
      captureId,
      method: 'GET',
      url: '/test',
      headers: {},
      requestBody: null,
      statusCode: 200,
      responseHeaders: null,
      responseBody: null,
      latencyMs: 10,
      traceId: 'abc-123-def',
      serviceVersion: null,
      recordedAt: new Date().toISOString(),
      db,
    })

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    expect(row.trace_id).toBe('abc-123-def')
  })

  it('should store null trace id when not provided', () => {
    const captureId = createCapture('svc')
    insertHttpRequest({
      captureId,
      method: 'GET',
      url: '/test',
      headers: {},
      requestBody: null,
      statusCode: 200,
      responseHeaders: null,
      responseBody: null,
      latencyMs: 10,
      traceId: null,
      serviceVersion: null,
      recordedAt: new Date().toISOString(),
      db,
    })

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    expect(row.trace_id).toBeNull()
  })
})
