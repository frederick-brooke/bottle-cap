import { describe, it, expect, vi, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'

describe('auth middleware', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('passes through when config.apiKey is not set', async () => {
    vi.doMock('../../../bottlecap.config', () => ({
      default: { api: { port: 3001, apiKey: undefined } },
    }))
    const { authMiddleware } = await import('../../../src/api/middleware/auth')
    const app = express()
    app.use(express.json())
    app.use('/api', authMiddleware)
    app.get('/api/test', (_req, res) => { res.json({ ok: true }) })

    const res = await request(app).get('/api/test')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('passes through when config.apiKey is empty string', async () => {
    vi.doMock('../../../bottlecap.config', () => ({
      default: { api: { port: 3001, apiKey: '' } },
    }))
    const { authMiddleware } = await import('../../../src/api/middleware/auth')
    const app = express()
    app.use(express.json())
    app.use('/api', authMiddleware)
    app.get('/api/test', (_req, res) => { res.json({ ok: true }) })

    const res = await request(app).get('/api/test')
    expect(res.status).toBe(200)
  })

  it('accepts valid key with timing-safe comparison', async () => {
    vi.doMock('../../../bottlecap.config', () => ({
      default: { api: { port: 3001, apiKey: 'real-key-123' } },
    }))
    const { authMiddleware } = await import('../../../src/api/middleware/auth')
    const app = express()
    app.use(express.json())
    app.use('/api', authMiddleware)
    app.get('/api/test', (_req, res) => { res.json({ ok: true }) })

    const res = await request(app)
      .get('/api/test')
      .set('Authorization', 'Bearer real-key-123')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('rejects missing auth header when key is configured', async () => {
    vi.doMock('../../../bottlecap.config', () => ({
      default: { api: { port: 3001, apiKey: 'my-secret' } },
    }))
    const { authMiddleware } = await import('../../../src/api/middleware/auth')
    const app = express()
    app.use(express.json())
    app.use('/api', authMiddleware)
    app.get('/api/test', (_req, res) => { res.json({ ok: true }) })

    const res = await request(app).get('/api/test')
    expect(res.status).toBe(401)
    expect(res.body.error).toContain('Missing or invalid')
  })

  it('returns 401 when API key is invalid', async () => {
    vi.doMock('../../../bottlecap.config', () => ({
      default: { api: { port: 3001, apiKey: 'test-secret-key' } },
    }))
    const { authMiddleware } = await import('../../../src/api/middleware/auth')
    const app = express()
    app.use(express.json())
    app.use('/api', authMiddleware)
    app.get('/api/test', (_req, res) => { res.json({ ok: true }) })

    const res = await request(app)
      .get('/api/test')
      .set('Authorization', 'Bearer wrong-key')
    expect(res.status).toBe(401)
    expect(res.body.error).toContain('Invalid API key')
  })

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    vi.doMock('../../../bottlecap.config', () => ({
      default: { api: { port: 3001, apiKey: 'test-secret-key' } },
    }))
    const { authMiddleware } = await import('../../../src/api/middleware/auth')
    const app = express()
    app.use(express.json())
    app.use('/api', authMiddleware)
    app.get('/api/test', (_req, res) => { res.json({ ok: true }) })

    const res = await request(app)
      .get('/api/test')
      .set('Authorization', 'test-secret-key')
    expect(res.status).toBe(401)
    expect(res.body.error).toContain('Missing or invalid')
  })

  it('returns 401 when Bearer token is empty', async () => {
    vi.doMock('../../../bottlecap.config', () => ({
      default: { api: { port: 3001, apiKey: 'test-secret-key' } },
    }))
    const { authMiddleware } = await import('../../../src/api/middleware/auth')
    const app = express()
    app.use(express.json())
    app.use('/api', authMiddleware)
    app.get('/api/test', (_req, res) => { res.json({ ok: true }) })

    const res = await request(app)
      .get('/api/test')
      .set('Authorization', 'Bearer ')
    expect(res.status).toBe(401)
    expect(res.body.error).toContain('Missing or invalid')
  })
})
