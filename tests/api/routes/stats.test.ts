import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../src/api/server'
import { getDatabase, runMigrations, closeDatabase } from '../../../src/storage/database'
import { createCapture } from '../../../src/storage/repositories/captures'
import { createReplay } from '../../../src/storage/repositories/replays'

let app: ReturnType<typeof createApp>

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

describe('GET /api/stats/:captureId', () => {
  it('returns capture stats with request count and replays', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })

    const db = getDatabase()
    db.prepare(`INSERT INTO http_requests (id, capture_id, method, url, status_code, latency_ms, recorded_at)
      VALUES (?, ?, 'GET', '/test', 200, 50, CURRENT_TIMESTAMP)`).run('req-1', cap.id)
    db.prepare(`INSERT INTO http_requests (id, capture_id, method, url, status_code, latency_ms, recorded_at)
      VALUES (?, ?, 'POST', '/test', 201, 100, CURRENT_TIMESTAMP)`).run('req-2', cap.id)

    createReplay({ capture_id: cap.id, target_url: 'http://staging.example.com', name: 'replay-1' })

    const res = await request(app).get(`/api/stats/${cap.id}`)
    expect(res.status).toBe(200)
    expect(res.body.capture.id).toBe(cap.id)
    expect(res.body.requestCount).toBe(2)
    expect(res.body.replays).toHaveLength(1)
    expect(res.body.replays[0].name).toBe('replay-1')
  })

  it('returns 0 request count and empty replays for new capture', async () => {
    const cap = createCapture({ name: 'empty', service_name: 'svc', target_url: 'http://localhost' })

    const res = await request(app).get(`/api/stats/${cap.id}`)
    expect(res.status).toBe(200)
    expect(res.body.requestCount).toBe(0)
    expect(res.body.replays).toEqual([])
  })

  it('returns 404 for non-existent capture', async () => {
    const res = await request(app).get('/api/stats/nonexistent')
    expect(res.status).toBe(404)
    expect(res.body.error).toContain('not found')
  })
})
