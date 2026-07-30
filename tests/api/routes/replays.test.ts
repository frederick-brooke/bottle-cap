import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../src/api/server'
import { getDatabase, runMigrations, closeDatabase } from '../../../src/storage/database'
import { createCapture } from '../../../src/storage/repositories/captures'
import { createReplay, updateReplayStatus } from '../../../src/storage/repositories/replays'

let app: ReturnType<typeof createApp>

vi.mock('../../../src/replay/engine', () => ({
  runReplay: vi.fn().mockResolvedValue(null),
}))

beforeAll(() => {
  runMigrations()
  app = createApp()
})

afterAll(() => {
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
})

describe('POST /api/replays', () => {
  it('creates a replay and returns 202', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })

    const res = await request(app)
      .post('/api/replays')
      .send({
        captureId: cap.id,
        targetUrl: 'http://staging.example.com',
        mode: 'burst',
      })

    expect(res.status).toBe(202)
    expect(res.body.replay).toBeDefined()
    expect(res.body.replay.capture_id).toBe(cap.id)
    expect(res.body.replay.mode).toBe('burst')
    expect(res.body.replay.target_url).toBe('http://staging.example.com')
  })

  it('returns 400 when captureId is missing', async () => {
    const res = await request(app)
      .post('/api/replays')
      .send({ targetUrl: 'http://staging.example.com' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('captureId')
  })

  it('returns 400 when targetUrl is missing', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })
    const res = await request(app)
      .post('/api/replays')
      .send({ captureId: cap.id })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('targetUrl')
  })

  it('returns 400 for invalid mode', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })
    const res = await request(app)
      .post('/api/replays')
      .send({ captureId: cap.id, targetUrl: 'http://staging.example.com', mode: 'invalid' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('mode')
  })

  it('returns 400 when throttled mode has no rateLimit', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })
    const res = await request(app)
      .post('/api/replays')
      .send({ captureId: cap.id, targetUrl: 'http://staging.example.com', mode: 'throttled' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('rateLimit')
  })

  it('returns 404 when capture does not exist', async () => {
    const res = await request(app)
      .post('/api/replays')
      .send({ captureId: 'nonexistent', targetUrl: 'http://staging.example.com' })

    expect(res.status).toBe(404)
    expect(res.body.error).toContain('Capture not found')
  })

  it('allows creating replay without mode (defaults to paced)', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })

    const res = await request(app)
      .post('/api/replays')
      .send({ captureId: cap.id, targetUrl: 'http://staging.example.com' })

    expect(res.status).toBe(202)
    expect(res.body.replay.mode).toBe('paced')
  })
})

describe('GET /api/replays', () => {
  it('returns empty array when no replays exist', async () => {
    const res = await request(app).get('/api/replays')
    expect(res.status).toBe(200)
    expect(res.body.replays).toEqual([])
  })

  it('returns replays with pagination', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })
    createReplay({ capture_id: cap.id, target_url: 'http://staging.example.com' })
    createReplay({ capture_id: cap.id, target_url: 'http://staging.example.com' })

    const res = await request(app).get('/api/replays?limit=1')
    expect(res.status).toBe(200)
    expect(res.body.replays).toHaveLength(1)
  })
})

describe('GET /api/replays/:id', () => {
  it('returns replay by ID with summary', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })
    const replay = createReplay({ capture_id: cap.id, target_url: 'http://staging.example.com' })

    const res = await request(app).get(`/api/replays/${replay.id}`)
    expect(res.status).toBe(200)
    expect(res.body.replay.id).toBe(replay.id)
    expect(res.body.summary).toBeDefined()
  })

  it('returns 404 for non-existent replay', async () => {
    const res = await request(app).get('/api/replays/nonexistent')
    expect(res.status).toBe(404)
    expect(res.body.error).toContain('not found')
  })
})

describe('POST /api/replays/:id/cancel', () => {
  it('cancels a running replay', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })
    const replay = createReplay({ capture_id: cap.id, target_url: 'http://staging.example.com' })
    updateReplayStatus(replay.id, 'running')

    const res = await request(app).post(`/api/replays/${replay.id}/cancel`)
    expect(res.status).toBe(200)
    expect(res.body.replay.status).toBe('failed')
  })

  it('cancels a pending replay', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })
    const replay = createReplay({ capture_id: cap.id, target_url: 'http://staging.example.com' })

    const res = await request(app).post(`/api/replays/${replay.id}/cancel`)
    expect(res.status).toBe(200)
    expect(res.body.replay.status).toBe('failed')
  })

  it('returns 404 for non-existent replay', async () => {
    const res = await request(app).post('/api/replays/nonexistent/cancel')
    expect(res.status).toBe(404)
  })

  it('returns 409 for already completed replay', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })
    const replay = createReplay({ capture_id: cap.id, target_url: 'http://staging.example.com' })
    updateReplayStatus(replay.id, 'completed')

    const res = await request(app).post(`/api/replays/${replay.id}/cancel`)
    expect(res.status).toBe(409)
    expect(res.body.error).toContain('cannot be cancelled')
  })

  it('returns 409 for already failed replay', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })
    const replay = createReplay({ capture_id: cap.id, target_url: 'http://staging.example.com' })
    updateReplayStatus(replay.id, 'failed')

    const res = await request(app).post(`/api/replays/${replay.id}/cancel`)
    expect(res.status).toBe(409)
  })
})
