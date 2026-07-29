import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'http'
import { createProxyServer } from '../../src/proxy/server'
import type { CaptureSession } from '../../src/proxy/types'
import { createMockTarget, createSlowMockTarget } from '../helpers/mock-target'
import { getDatabase, runMigrations } from '../../src/storage/database'

let db: ReturnType<typeof getDatabase>
let mockTarget: Awaited<ReturnType<typeof createMockTarget>>

beforeAll(async () => {
  db = getDatabase()
  runMigrations()
  mockTarget = await createMockTarget()
})

afterAll(async () => {
  await mockTarget.close()
})

function makeRequest(port: number, path: string, options?: { method?: string; body?: string; headers?: Record<string, string> }): Promise<{ statusCode: number; body: string; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      method: options?.method || 'GET',
      headers: options?.headers || {},
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf-8'),
          headers: res.headers as Record<string, string>,
        })
      })
    })
    req.on('error', reject)
    if (options?.body) req.write(options.body)
    req.end()
  })
}

function createTestCapture(): string {
  const id = `test-proxy-cap-${Date.now()}-${Math.random().toString(36).slice(2)}`
  db.prepare(`INSERT INTO captures (id, service_name, target_url) VALUES (?, ?, ?)`).run(id, 'test-svc', 'http://localhost')
  return id
}

describe('ProxyServer', () => {
  it('should start and listen on a port', async () => {
    const captureId = createTestCapture()
    const session: CaptureSession = {
      captureId,
      targetUrl: mockTarget.url,
      sampleRate: 1.0,
      listenPort: 0,
      maxBodySize: 1024 * 1024,
    }

    const server = createProxyServer(session)
    await server.listen(0)
    const port = server.port()
    expect(port).toBeGreaterThan(0)

    await server.close()
  })

  it('should proxy GET requests to target', async () => {
    const captureId = createTestCapture()
    const session: CaptureSession = {
      captureId,
      targetUrl: mockTarget.url,
      sampleRate: 0,
      listenPort: 0,
      maxBodySize: 1024 * 1024,
    }

    const server = createProxyServer(session)
    await server.listen(0)
    const port = server.port()!

    const res = await makeRequest(port, '/api/test')
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.echo.method).toBe('GET')
    expect(body.echo.url).toBe('/api/test')

    await server.close()
  })

  it('should proxy POST requests with body', async () => {
    const captureId = createTestCapture()
    const session: CaptureSession = {
      captureId,
      targetUrl: mockTarget.url,
      sampleRate: 0,
      listenPort: 0,
      maxBodySize: 1024 * 1024,
    }

    const server = createProxyServer(session)
    await server.listen(0)
    const port = server.port()!

    const res = await makeRequest(port, '/api/data', {
      method: 'POST',
      body: JSON.stringify({ hello: 'world' }),
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.echo.method).toBe('POST')
    expect(body.echo.body).toBe('{"hello":"world"}')

    await server.close()
  })

  it('should capture requests to SQLite when sample rate = 1.0', async () => {
    const captureId = createTestCapture()
    const session: CaptureSession = {
      captureId,
      targetUrl: mockTarget.url,
      sampleRate: 1.0,
      listenPort: 0,
      maxBodySize: 1024 * 1024,
    }

    const server = createProxyServer(session)
    await server.listen(0)
    const port = server.port()!

    await makeRequest(port, '/api/users')
    await makeRequest(port, '/api/posts', { method: 'POST', body: '{"title":"test"}' })

    await new Promise(r => setTimeout(r, 500))

    const rows = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').all(captureId) as Record<string, unknown>[]
    expect(rows.length).toBe(2)

    const row1 = rows.find(r => r.url === '/api/users')!
    expect(row1.method).toBe('GET')
    expect(row1.status_code).toBe(200)

    const row2 = rows.find(r => r.url === '/api/posts')!
    expect(row2.method).toBe('POST')
    expect(row2.status_code).toBe(200)

    await server.close()
  })

  it('should not capture when sample rate = 0', async () => {
    const captureId = createTestCapture()
    const session: CaptureSession = {
      captureId,
      targetUrl: mockTarget.url,
      sampleRate: 0,
      listenPort: 0,
      maxBodySize: 1024 * 1024,
    }

    const server = createProxyServer(session)
    await server.listen(0)
    const port = server.port()!

    await makeRequest(port, '/api/test')
    await new Promise(r => setTimeout(r, 500))

    const count = db.prepare('SELECT COUNT(*) as c FROM http_requests WHERE capture_id = ?').get(captureId) as { c: number }
    expect(count.c).toBe(0)

    await server.close()
  })

  it('should sanitize Authorization header before capture', async () => {
    const captureId = createTestCapture()
    const session: CaptureSession = {
      captureId,
      targetUrl: mockTarget.url,
      sampleRate: 1.0,
      listenPort: 0,
      maxBodySize: 1024 * 1024,
    }

    const server = createProxyServer(session)
    await server.listen(0)
    const port = server.port()!

    await makeRequest(port, '/api/secure', {
      headers: { 'authorization': 'Bearer secret-token' },
    })
    await new Promise(r => setTimeout(r, 500))

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    expect(row).toBeDefined()
    const headers = JSON.parse(row.headers as string)
    expect(headers.authorization).toBeUndefined()

    await server.close()
  })

  it('should capture response headers', async () => {
    const captureId = createTestCapture()
    const session: CaptureSession = {
      captureId,
      targetUrl: mockTarget.url,
      sampleRate: 1.0,
      listenPort: 0,
      maxBodySize: 1024 * 1024,
    }

    const server = createProxyServer(session)
    await server.listen(0)
    const port = server.port()!

    await makeRequest(port, '/api/headers')
    await new Promise(r => setTimeout(r, 500))

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    expect(row).toBeDefined()
    const respHeaders = JSON.parse(row.response_headers as string)
    expect(respHeaders['x-mock']).toBe('true')

    await server.close()
  })

  it('should calculate latency', async () => {
    const slowTarget = await createSlowMockTarget(50)
    const captureId = createTestCapture()
    const session: CaptureSession = {
      captureId,
      targetUrl: slowTarget.url,
      sampleRate: 1.0,
      listenPort: 0,
      maxBodySize: 1024 * 1024,
    }

    const server = createProxyServer(session)
    await server.listen(0)
    const port = server.port()!

    await makeRequest(port, '/slow')
    await new Promise(r => setTimeout(r, 500))

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    expect(row).toBeDefined()
    expect(row.latency_ms).toBeGreaterThanOrEqual(40)

    await server.close()
    await slowTarget.close()
  })

  it('should handle upstream connection refused', async () => {
    const captureId = createTestCapture()
    const session: CaptureSession = {
      captureId,
      targetUrl: 'http://localhost:19999',
      sampleRate: 0,
      listenPort: 0,
      maxBodySize: 1024 * 1024,
    }

    const server = createProxyServer(session)
    await server.listen(0)
    const port = server.port()!

    const res = await makeRequest(port, '/test')
    expect(res.statusCode).toBe(502)

    await server.close()
  })

  it('should handle concurrent requests', async () => {
    const captureId = createTestCapture()
    const session: CaptureSession = {
      captureId,
      targetUrl: mockTarget.url,
      sampleRate: 1.0,
      listenPort: 0,
      maxBodySize: 1024 * 1024,
    }

    const server = createProxyServer(session)
    await server.listen(0)
    const port = server.port()!

    const promises = Array.from({ length: 10 }, (_, i) =>
      makeRequest(port, `/api/concurrent/${i}`)
    )
    const results = await Promise.all(promises)
    expect(results.every(r => r.statusCode === 200)).toBe(true)

    await new Promise(r => setTimeout(r, 1000))

    const count = db.prepare('SELECT COUNT(*) as c FROM http_requests WHERE capture_id = ?').get(captureId) as { c: number }
    expect(count.c).toBe(10)

    await server.close()
  })

  it('should preserve query strings', async () => {
    const captureId = createTestCapture()
    const session: CaptureSession = {
      captureId,
      targetUrl: mockTarget.url,
      sampleRate: 1.0,
      listenPort: 0,
      maxBodySize: 1024 * 1024,
    }

    const server = createProxyServer(session)
    await server.listen(0)
    const port = server.port()!

    await makeRequest(port, '/api/search?q=test&page=1')
    await new Promise(r => setTimeout(r, 500))

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    expect(row).toBeDefined()
    expect(row.url).toBe('/api/search?q=test&page=1')

    await server.close()
  })
})
