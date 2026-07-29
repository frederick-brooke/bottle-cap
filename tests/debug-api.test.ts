import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'http'
import Database from 'better-sqlite3'
import { getDatabase, runMigrations } from '../src/storage/database'
import { startCaptureProxy, stopCaptureProxy } from '../src/proxy/manager'
import { createMockTarget } from './helpers/mock-target'

let db: Database.Database
let mockTarget: Awaited<ReturnType<typeof createMockTarget>>

beforeAll(async () => {
  db = getDatabase()
  runMigrations()
  mockTarget = await createMockTarget()
})

afterAll(async () => {
  await mockTarget.close()
  const { getActiveProxies } = await import('../src/proxy/manager')
  for (const [id] of getActiveProxies()) {
    await stopCaptureProxy(id)
  }
})

function createTestCapture(id: string): void {
  db.prepare(`INSERT INTO captures (id, service_name, target_url) VALUES (?, ?, ?)`).run(id, 'test-svc', mockTarget.url)
}

function makeRequest(port: number, path: string, options?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      method: options?.method || 'GET',
      headers: options?.headers || {},
    }, (res) => {
      res.resume()
      res.on('end', resolve)
    })
    req.on('error', reject)
    if (options?.body) req.write(options.body)
    req.end()
  })
}

describe('debug API integration', () => {
  it('should start proxy, capture traffic, and read back from DB', async () => {
    const captureId = `debug-int-${Date.now()}-${Math.random().toString(36).slice(2)}`
    createTestCapture(captureId)

    const port = await startCaptureProxy(captureId, mockTarget.url, 1.0, 0)
    expect(port).toBeGreaterThan(0)

    await makeRequest(port, '/api/users')
    await new Promise(r => setTimeout(r, 500))

    const rows = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').all(captureId) as Record<string, unknown>[]
    expect(rows.length).toBeGreaterThanOrEqual(1)

    const row = rows[0]
    expect(row.method).toBe('GET')
    expect(row.url).toBe('/api/users')
    expect(row.status_code).toBe(200)
    expect(typeof row.headers).toBe('string')

    await stopCaptureProxy(captureId)
  })

  it('should read request detail with body from DB', async () => {
    const captureId = `debug-body-${Date.now()}-${Math.random().toString(36).slice(2)}`
    createTestCapture(captureId)

    const port = await startCaptureProxy(captureId, mockTarget.url, 1.0, 0)

    await makeRequest(port, '/api/data', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'value' }),
    })
    await new Promise(r => setTimeout(r, 500))

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ? AND method = ?').get(captureId, 'POST') as Record<string, unknown>
    expect(row).toBeDefined()
    expect(row.method).toBe('POST')
    expect(row.request_body_preview).toContain('key')

    await stopCaptureProxy(captureId)
  })

  it('should sanitize headers in captured requests', async () => {
    const captureId = `debug-san-${Date.now()}-${Math.random().toString(36).slice(2)}`
    createTestCapture(captureId)

    const port = await startCaptureProxy(captureId, mockTarget.url, 1.0, 0)

    await makeRequest(port, '/api/auth', {
      headers: { 'authorization': 'Bearer secret123', 'accept': 'application/json' },
    })
    await new Promise(r => setTimeout(r, 500))

    const row = db.prepare('SELECT * FROM http_requests WHERE capture_id = ?').get(captureId) as Record<string, unknown>
    expect(row).toBeDefined()
    const headers = JSON.parse(row.headers as string)
    expect(headers.authorization).toBeUndefined()
    expect(headers.accept).toBe('application/json')

    await stopCaptureProxy(captureId)
  })

  it('should not capture when sample rate is 0', async () => {
    const captureId = `debug-nosample-${Date.now()}-${Math.random().toString(36).slice(2)}`
    createTestCapture(captureId)

    const port = await startCaptureProxy(captureId, mockTarget.url, 0.0, 0)

    await makeRequest(port, '/test')
    await new Promise(r => setTimeout(r, 500))

    const count = db.prepare('SELECT COUNT(*) as c FROM http_requests WHERE capture_id = ?').get(captureId) as { c: number }
    expect(count.c).toBe(0)

    await stopCaptureProxy(captureId)
  })

  it('should handle multiple concurrent captures on different ports', async () => {
    const id1 = `debug-multi1-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const id2 = `debug-multi2-${Date.now()}-${Math.random().toString(36).slice(2)}`
    createTestCapture(id1)
    createTestCapture(id2)

    const port1 = await startCaptureProxy(id1, mockTarget.url, 1.0, 0)
    const port2 = await startCaptureProxy(id2, mockTarget.url, 1.0, 0)
    expect(port1).not.toBe(port2)

    await Promise.all([
      makeRequest(port1, '/from-capture-1'),
      makeRequest(port2, '/from-capture-2'),
    ])
    await new Promise(r => setTimeout(r, 500))

    const r1 = db.prepare('SELECT COUNT(*) as c FROM http_requests WHERE capture_id = ?').get(id1) as { c: number }
    const r2 = db.prepare('SELECT COUNT(*) as c FROM http_requests WHERE capture_id = ?').get(id2) as { c: number }
    expect(r1.c).toBeGreaterThanOrEqual(1)
    expect(r2.c).toBeGreaterThanOrEqual(1)

    await Promise.all([stopCaptureProxy(id1), stopCaptureProxy(id2)])
  })
})
