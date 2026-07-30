import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../src/api/server'
import { getDatabase, runMigrations, closeDatabase } from '../../../src/storage/database'
import { createCapture } from '../../../src/storage/repositories/captures'
import { createMockTarget } from '../../helpers/mock-target'
import { stopCaptureProxy, getActiveProxies } from '../../../src/proxy/manager'
import type { MockTarget } from '../../helpers/mock-target'

let app: ReturnType<typeof createApp>
let mockTarget: MockTarget

beforeAll(async () => {
  runMigrations()
  mockTarget = await createMockTarget()
  app = createApp()
})

afterAll(async () => {
  await mockTarget.close()
  closeDatabase()
})

beforeEach(() => {
  const db = getDatabase()
  db.pragma('foreign_keys = OFF')
  db.exec('DELETE FROM replay_results')
  db.exec('DELETE FROM replays')
  db.exec('DELETE FROM http_requests')
  db.exec('DELETE FROM captures')
  db.pragma('foreign_keys = ON')

  const proxies = getActiveProxies()
  for (const [id] of proxies) {
    stopCaptureProxy(id)
  }
})

describe('POST /api/captures', () => {
  it('creates a capture and starts proxy', async () => {
    const res = await request(app)
      .post('/api/captures')
      .send({
        name: 'test-capture',
        serviceName: 'test-service',
        targetUrl: mockTarget.url,
        port: 0,
      })

    expect(res.status).toBe(201)
    expect(res.body.capture).toBeDefined()
    expect(res.body.capture.name).toBe('test-capture')
    expect(res.body.capture.service_name).toBe('test-service')
    expect(res.body.capture.target_url).toBe(mockTarget.url)
    expect(res.body.capture.status).toBe('active')
    expect(res.body.proxyPort).toBeGreaterThan(0)

    await stopCaptureProxy(res.body.capture.id)
  })

  it('returns 400 when serviceName is missing', async () => {
    const res = await request(app)
      .post('/api/captures')
      .send({ targetUrl: mockTarget.url })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('serviceName')
  })

  it('returns 400 when targetUrl is missing', async () => {
    const res = await request(app)
      .post('/api/captures')
      .send({ serviceName: 'test-service' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('targetUrl')
  })

  it('returns 400 for invalid sampleRate', async () => {
    const res = await request(app)
      .post('/api/captures')
      .send({
        serviceName: 'test-service',
        targetUrl: mockTarget.url,
        sampleRate: 2.0,
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('sampleRate')
  })

  it('returns 400 for invalid port', async () => {
    const res = await request(app)
      .post('/api/captures')
      .send({
        serviceName: 'test-service',
        targetUrl: mockTarget.url,
        port: -1,
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('port')
  })

  it('returns 409 when port is already in use', async () => {
    const net = await import('net')
    const server = net.createServer()
    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as net.AddressInfo
        resolve(addr.port)
      })
    })

    try {
      const res = await request(app)
        .post('/api/captures')
        .send({
          serviceName: 'test-service',
          targetUrl: mockTarget.url,
          port,
        })

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('already in use')
    } finally {
      server.close()
    }
  })
})

describe('GET /api/captures', () => {
  it('returns empty array when no captures exist', async () => {
    const res = await request(app).get('/api/captures')
    expect(res.status).toBe(200)
    expect(res.body.captures).toEqual([])
  })

  it('returns captures with pagination', async () => {
    createCapture({ name: 'cap-1', service_name: 'svc', target_url: 'http://localhost' })
    createCapture({ name: 'cap-2', service_name: 'svc', target_url: 'http://localhost' })

    const res = await request(app).get('/api/captures?limit=1')
    expect(res.status).toBe(200)
    expect(res.body.captures).toHaveLength(1)
  })

  it('handles invalid pagination params', async () => {
    const res = await request(app).get('/api/captures?limit=-1&offset=-5')
    expect(res.status).toBe(200)
    expect(res.body.captures).toBeDefined()
  })
})

describe('GET /api/captures/:id', () => {
  it('returns a capture by ID', async () => {
    const cap = createCapture({ name: 'test', service_name: 'svc', target_url: 'http://localhost' })
    const res = await request(app).get(`/api/captures/${cap.id}`)
    expect(res.status).toBe(200)
    expect(res.body.capture.id).toBe(cap.id)
    expect(res.body.capture.name).toBe('test')
  })

  it('returns 404 for non-existent capture', async () => {
    const res = await request(app).get('/api/captures/nonexistent-id')
    expect(res.status).toBe(404)
    expect(res.body.error).toContain('not found')
  })
})

describe('DELETE /api/captures/:id', () => {
  it('stops an active capture', async () => {
    const res = await request(app)
      .post('/api/captures')
      .send({
        name: 'to-stop',
        serviceName: 'svc',
        targetUrl: mockTarget.url,
        port: 0,
      })

    const captureId = res.body.capture.id

    const del = await request(app).delete(`/api/captures/${captureId}`)
    expect(del.status).toBe(200)
    expect(del.body.capture.status).toBe('completed')
  })

  it('returns 404 for non-existent capture', async () => {
    const res = await request(app).delete('/api/captures/nonexistent')
    expect(res.status).toBe(404)
  })

  it('returns 409 for non-active capture', async () => {
    const cap = createCapture({ name: 'done', service_name: 'svc', target_url: 'http://localhost' })
    const { updateCaptureStatus } = await import('../../../src/storage/repositories/captures')
    updateCaptureStatus(cap.id, 'completed')

    const res = await request(app).delete(`/api/captures/${cap.id}`)
    expect(res.status).toBe(409)
    expect(res.body.error).toContain('not active')
  })
})
