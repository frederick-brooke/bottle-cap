import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'http'
import Database from 'better-sqlite3'
import { getDatabase, runMigrations } from '../../src/storage/database'
import { startCaptureProxy, stopCaptureProxy, getProxyPort } from '../../src/proxy/manager'
import { createMockTarget } from '../helpers/mock-target'

let db: Database.Database
let mockTarget: Awaited<ReturnType<typeof createMockTarget>>

beforeAll(async () => {
  db = getDatabase()
  runMigrations()
  mockTarget = await createMockTarget()
})

afterAll(async () => {
  await mockTarget.close()
  const { getActiveProxies } = await import('../../src/proxy/manager')
  for (const [id] of getActiveProxies()) {
    await stopCaptureProxy(id)
  }
})

function makeRequest(port: number, path: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port, path, method: 'GET' }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf-8') }))
    })
    req.on('error', reject)
    req.end()
  })
}

function createTestCapture(id: string): void {
  db.prepare(`INSERT INTO captures (id, service_name, target_url) VALUES (?, ?, ?)`).run(id, 'test-svc', mockTarget.url)
}

describe('proxy manager', () => {
  it('should start a proxy and return the actual port', async () => {
    const captureId = `mgr-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    createTestCapture(captureId)

    const port = await startCaptureProxy(captureId, mockTarget.url, 1.0, 0)
    expect(port).toBeGreaterThan(0)

    const res = await makeRequest(port, '/hello')
    expect(res.statusCode).toBe(200)

    await stopCaptureProxy(captureId)
  })

  it('should track active proxies', async () => {
    const captureId = `mgr-active-${Date.now()}-${Math.random().toString(36).slice(2)}`
    createTestCapture(captureId)

    const port = await startCaptureProxy(captureId, mockTarget.url, 1.0, 0)
    const active = (await import('../../src/proxy/manager')).getActiveProxies()
    expect(active.has(captureId)).toBe(true)
    expect(active.get(captureId)!.port).toBe(port)
    expect(active.get(captureId)!.targetUrl).toBe(mockTarget.url)

    await stopCaptureProxy(captureId)
    const afterStop = (await import('../../src/proxy/manager')).getActiveProxies()
    expect(afterStop.has(captureId)).toBe(false)
  })

  it('should get proxy port for a capture', async () => {
    const captureId = `mgr-port-${Date.now()}-${Math.random().toString(36).slice(2)}`
    createTestCapture(captureId)

    expect(getProxyPort(captureId)).toBeNull()

    const port = await startCaptureProxy(captureId, mockTarget.url, 1.0, 0)
    expect(getProxyPort(captureId)).toBe(port)

    await stopCaptureProxy(captureId)
    expect(getProxyPort(captureId)).toBeNull()
  })

  it('should throw when starting proxy for already active capture', async () => {
    const captureId = `mgr-dup-${Date.now()}-${Math.random().toString(36).slice(2)}`
    createTestCapture(captureId)

    await startCaptureProxy(captureId, mockTarget.url, 1.0, 0)

    await expect(startCaptureProxy(captureId, mockTarget.url, 1.0, 0))
      .rejects.toThrow('Proxy already running')

    await stopCaptureProxy(captureId)
  })

  it('should handle stopping a non-existent proxy gracefully', async () => {
    await expect(stopCaptureProxy('nonexistent')).resolves.toBeUndefined()
  })

  it('should proxy traffic through the manager', async () => {
    const captureId = `mgr-proxy-${Date.now()}-${Math.random().toString(36).slice(2)}`
    createTestCapture(captureId)

    const port = await startCaptureProxy(captureId, mockTarget.url, 1.0, 0)

    await makeRequest(port, '/test1')
    await makeRequest(port, '/test2')

    await new Promise(r => setTimeout(r, 500))

    const count = db.prepare('SELECT COUNT(*) as c FROM http_requests WHERE capture_id = ?').get(captureId) as { c: number }
    expect(count.c).toBe(2)

    await stopCaptureProxy(captureId)
  })
})
