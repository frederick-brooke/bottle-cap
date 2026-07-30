import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getDatabase, runMigrations, closeDatabase } from '../../src/storage/database'
import { createCapture, listCaptures, getCapture } from '../../src/storage/repositories/captures'
import { createReplay, listReplays, updateReplayStatus } from '../../src/storage/repositories/replays'
import { getResultsByReplay, getReplaySummary, getReplaySummariesByReplayIds } from '../../src/storage/repositories/results'

beforeAll(() => {
  runMigrations()
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

describe('Dashboard Stats', () => {
  it('returns zero counts when empty', () => {
    const db = getDatabase()
    const captureCount = (db.prepare('SELECT COUNT(*) as count FROM captures').get() as { count: number }).count
    const replayCount = (db.prepare('SELECT COUNT(*) as count FROM replays').get() as { count: number }).count

    expect(captureCount).toBe(0)
    expect(replayCount).toBe(0)
  })

  it('returns correct counts with data', () => {
    const cap = createCapture({ name: 'test', service_name: 'svc', target_url: 'http://localhost' })
    createReplay({ capture_id: cap.id, target_url: 'http://localhost', mode: 'burst' })

    const db = getDatabase()
    const captureCount = (db.prepare('SELECT COUNT(*) as count FROM captures').get() as { count: number }).count
    const replayCount = (db.prepare('SELECT COUNT(*) as count FROM replays').get() as { count: number }).count

    expect(captureCount).toBe(1)
    expect(replayCount).toBe(1)
  })
})

describe('Dashboard Captures', () => {
  it('returns empty array when no captures exist', () => {
    const captures = listCaptures({ limit: 50 })
    expect(captures).toEqual([])
  })

  it('returns captures with pagination', () => {
    createCapture({ name: 'cap-1', service_name: 'svc', target_url: 'http://localhost' })
    createCapture({ name: 'cap-2', service_name: 'svc', target_url: 'http://localhost' })

    const page1 = listCaptures({ limit: 1, offset: 0 })
    expect(page1).toHaveLength(1)

    const page2 = listCaptures({ limit: 1, offset: 1 })
    expect(page2).toHaveLength(1)
    expect(page2[0].id).not.toBe(page1[0].id)
  })

  it('returns capture by ID', () => {
    const cap = createCapture({ name: 'test', service_name: 'svc', target_url: 'http://localhost' })
    const found = getCapture(cap.id)
    expect(found).toBeDefined()
    expect(found!.id).toBe(cap.id)
    expect(found!.name).toBe('test')
  })

  it('returns null for non-existent capture', () => {
    const found = getCapture('00000000-0000-0000-0000-000000000000')
    expect(found).toBeNull()
  })
})

describe('Dashboard Replays', () => {
  it('returns empty array when no replays exist', () => {
    const replays = listReplays({ limit: 50 })
    expect(replays).toEqual([])
  })

  it('returns replays with summaries', () => {
    const cap = createCapture({ name: 'test', service_name: 'svc', target_url: 'http://localhost' })
    const replay = createReplay({ capture_id: cap.id, target_url: 'http://localhost', mode: 'burst' })

    const replays = listReplays({ limit: 50 })
    expect(replays).toHaveLength(1)

    const summary = getReplaySummary(replay.id)
    expect(summary).toBeDefined()
    expect(summary!.total).toBe(0)
  })

  it('creates a replay', () => {
    const cap = createCapture({ name: 'test', service_name: 'svc', target_url: 'http://localhost' })
    const replay = createReplay({
      capture_id: cap.id,
      target_url: 'http://localhost:3001',
      mode: 'burst',
      triggered_by: 'dashboard',
    })

    expect(replay).toBeDefined()
    expect(replay.capture_id).toBe(cap.id)
    expect(replay.mode).toBe('burst')
    expect(replay.triggered_by).toBe('dashboard')
  })

  it('cancels a running replay', () => {
    const cap = createCapture({ name: 'test', service_name: 'svc', target_url: 'http://localhost' })
    const replay = createReplay({ capture_id: cap.id, target_url: 'http://localhost', mode: 'paced' })

    updateReplayStatus(replay.id, 'running')
    const updated = updateReplayStatus(replay.id, 'failed')

    expect(updated).toBeDefined()
    expect(updated!.status).toBe('failed')
  })
})

describe('Dashboard Results', () => {
  it('returns empty results for a replay', () => {
    const cap = createCapture({ name: 'test', service_name: 'svc', target_url: 'http://localhost' })
    const replay = createReplay({ capture_id: cap.id, target_url: 'http://localhost', mode: 'paced' })

    const results = getResultsByReplay(replay.id)
    expect(results).toEqual([])
  })

  it('returns replay summary', () => {
    const cap = createCapture({ name: 'test', service_name: 'svc', target_url: 'http://localhost' })
    const replay = createReplay({ capture_id: cap.id, target_url: 'http://localhost', mode: 'paced' })

    const summary = getReplaySummary(replay.id)
    expect(summary).toBeDefined()
    expect(summary!.total).toBe(0)
    expect(summary!.identical).toBe(0)
    expect(summary!.errors).toBe(0)
  })

  it('returns summaries for multiple replays', () => {
    const cap = createCapture({ name: 'test', service_name: 'svc', target_url: 'http://localhost' })
    const replay1 = createReplay({ capture_id: cap.id, target_url: 'http://localhost', mode: 'paced' })
    const replay2 = createReplay({ capture_id: cap.id, target_url: 'http://localhost', mode: 'burst' })

    const summaries = getReplaySummariesByReplayIds([replay1.id, replay2.id])
    expect(summaries.size).toBe(2)
    expect(summaries.has(replay1.id)).toBe(true)
    expect(summaries.has(replay2.id)).toBe(true)
  })

  it('returns empty map for empty input', () => {
    const summaries = getReplaySummariesByReplayIds([])
    expect(summaries.size).toBe(0)
  })
})

describe('Dashboard Capture Stats', () => {
  it('returns capture with replays', () => {
    const cap = createCapture({ name: 'test', service_name: 'svc', target_url: 'http://localhost' })
    createReplay({ capture_id: cap.id, target_url: 'http://localhost', mode: 'burst' })

    const db = getDatabase()
    const requestCount = (db.prepare(
      'SELECT COUNT(*) as count FROM http_requests WHERE capture_id = ?'
    ).get(cap.id) as { count: number }).count

    const replays = listReplays({ limit: 50 }).filter(r => r.capture_id === cap.id)
    const replayIds = replays.map(r => r.id)
    const summaries = getReplaySummariesByReplayIds(replayIds)

    expect(requestCount).toBe(0)
    expect(replays).toHaveLength(1)
    expect(summaries.size).toBe(1)
  })
})
