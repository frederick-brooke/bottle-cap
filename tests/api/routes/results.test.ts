import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../src/api/server'
import { getDatabase, runMigrations, closeDatabase } from '../../../src/storage/database'
import { createCapture } from '../../../src/storage/repositories/captures'
import { createReplay } from '../../../src/storage/repositories/replays'
import { createResult } from '../../../src/storage/repositories/results'

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

describe('GET /api/results/:replayId', () => {
  it('returns results and summary for a replay', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })
    const replay = createReplay({ capture_id: cap.id, target_url: 'http://staging.example.com' })

    const db = getDatabase()
    db.prepare(`INSERT INTO http_requests (id, capture_id, method, url, status_code, latency_ms, recorded_at)
      VALUES (?, ?, 'GET', '/test', 200, 50, CURRENT_TIMESTAMP)`).run('req-1', cap.id)

    createResult({
      replay_id: replay.id,
      request_id: 'req-1',
      original_status: 200,
      replayed_status: 200,
      original_latency_ms: 50,
      replayed_latency_ms: 45,
      body_identical: true,
    })

    const res = await request(app).get(`/api/results/${replay.id}`)
    expect(res.status).toBe(200)
    expect(res.body.results).toHaveLength(1)
    expect(res.body.results[0].original_status).toBe(200)
    expect(res.body.results[0].replayed_status).toBe(200)
    expect(res.body.summary).toBeDefined()
  })

  it('returns empty results for replay with no results', async () => {
    const cap = createCapture({ name: 'cap', service_name: 'svc', target_url: 'http://localhost' })
    const replay = createReplay({ capture_id: cap.id, target_url: 'http://staging.example.com' })

    const res = await request(app).get(`/api/results/${replay.id}`)
    expect(res.status).toBe(200)
    expect(res.body.results).toEqual([])
    expect(res.body.summary).toBeDefined()
  })

  it('returns 404 for non-existent replay', async () => {
    const res = await request(app).get('/api/results/nonexistent')
    expect(res.status).toBe(404)
    expect(res.body.error).toContain('not found')
  })
})
