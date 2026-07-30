import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getDatabase, runMigrations } from '../../src/storage/database'
import { createMockTarget, createSlowMockTarget, type MockTarget } from '../helpers/mock-target'
import { createCapture } from '../../src/storage/repositories/captures'
import { createReplay, getReplay } from '../../src/storage/repositories/replays'
import { getResultsByReplay } from '../../src/storage/repositories/results'
import { runReplay } from '../../src/replay/engine'

let mockTarget: MockTarget

beforeAll(async () => {
  runMigrations()
  mockTarget = await createMockTarget()
})

afterAll(async () => {
  await mockTarget.close()
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

function insertHttpRequest(captureId: string, opts: {
  id: string
  method: string
  url: string
  statusCode: number
  latencyMs: number
  responseBody?: string
  recordedAt?: string
}): void {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO http_requests (id, capture_id, method, url, status_code, latency_ms, response_body_key, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    opts.id,
    captureId,
    opts.method,
    opts.url,
    opts.statusCode,
    opts.latencyMs,
    opts.responseBody ?? null,
    opts.recordedAt ?? '2024-01-01T00:00:00Z',
  )
}

describe('runReplay', () => {
  it('runs a successful replay', async () => {
    const capture = createCapture({
      name: 'test-capture',
      service_name: 'test-service',
      target_url: mockTarget.url,
    })

    insertHttpRequest(capture.id, {
      id: 'req-a-1',
      method: 'GET',
      url: `${mockTarget.url}/api/users`,
      statusCode: 200,
      latencyMs: 50,
      responseBody: '{"users":[]}',
    })
    insertHttpRequest(capture.id, {
      id: 'req-a-2',
      method: 'POST',
      url: `${mockTarget.url}/api/users`,
      statusCode: 201,
      latencyMs: 100,
      responseBody: '{"id":1}',
      recordedAt: '2024-01-01T00:00:01Z',
    })

    const replay = createReplay({
      capture_id: capture.id,
      target_url: mockTarget.url,
      mode: 'burst',
    })

    const progress: Array<{ completed: number; total: number }> = []
    await runReplay(replay.id, (completed, total) => {
      progress.push({ completed, total })
    })

    const updatedReplay = getReplay(replay.id)
    expect(updatedReplay?.status).toBe('completed')
    expect(updatedReplay?.completed_requests).toBe(2)
    expect(updatedReplay?.total_requests).toBe(2)

    const results = getResultsByReplay(replay.id)
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.replayed_status === 200)).toBe(true)
    expect(results.every((r) => r.error === null)).toBe(true)

    expect(progress.length).toBeGreaterThan(0)
    expect(progress[progress.length - 1].completed).toBe(2)
  }, 10000)

  it('throws for non-existent replay', async () => {
    await expect(runReplay('non-existent')).rejects.toThrow('Replay not found')
  })

  it('throws for non-pending replay', async () => {
    const capture = createCapture({
      name: 'test-capture',
      service_name: 'test-service',
      target_url: mockTarget.url,
    })

    const replay = createReplay({
      capture_id: capture.id,
      target_url: mockTarget.url,
    })

    const db = getDatabase()
    db.prepare("UPDATE replays SET status = 'running' WHERE id = ?").run(replay.id)

    await expect(runReplay(replay.id)).rejects.toThrow('Replay cannot be run')
  })

  it('handles empty capture (no requests)', async () => {
    const capture = createCapture({
      name: 'empty-capture',
      service_name: 'test-service',
      target_url: mockTarget.url,
    })

    const replay = createReplay({
      capture_id: capture.id,
      target_url: mockTarget.url,
      mode: 'burst',
    })

    await runReplay(replay.id)

    const updatedReplay = getReplay(replay.id)
    expect(updatedReplay?.status).toBe('completed')
    expect(updatedReplay?.total_requests).toBe(0)
    expect(updatedReplay?.completed_requests).toBe(0)
  })

  it('can be cancelled mid-flight', async () => {
    const slowTarget = await createSlowMockTarget(200)

    const capture = createCapture({
      name: 'cancel-capture',
      service_name: 'test-service',
      target_url: slowTarget.url,
    })

    for (let i = 0; i < 10; i++) {
      insertHttpRequest(capture.id, {
        id: `cancel-req-${i}`,
        method: 'GET',
        url: `${slowTarget.url}/api`,
        statusCode: 200,
        latencyMs: 50,
        recordedAt: `2024-01-01T00:00:0${i}Z`,
      })
    }

    const replay = createReplay({
      capture_id: capture.id,
      target_url: slowTarget.url,
      mode: 'paced',
    })

    let completedCount = 0
    const replayPromise = runReplay(replay.id, (completed) => {
      completedCount = completed
      if (completed >= 2) {
        const db = getDatabase()
        db.prepare("UPDATE replays SET status = 'failed' WHERE id = ?").run(replay.id)
      }
    })

    await replayPromise

    const updatedReplay = getReplay(replay.id)
    expect(updatedReplay?.status).toBe('failed')
    expect(completedCount).toBeGreaterThanOrEqual(2)

    await slowTarget.close()
  }, 15000)
})
