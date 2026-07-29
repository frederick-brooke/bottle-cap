import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let testDb: Database.Database

beforeAll(() => {
  const testDbPath = path.resolve('./data/test.db')
  testDb = new Database(testDbPath)
  testDb.pragma('journal_mode = WAL')
  testDb.pragma('foreign_keys = ON')

  const migrationPath = path.resolve('./migrations/001_initial.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')
  testDb.exec(sql)
})

afterAll(() => {
  testDb.close()
  const testDbPath = path.resolve('./data/test.db')
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath)
  if (fs.existsSync(testDbPath + '-wal')) fs.unlinkSync(testDbPath + '-wal')
  if (fs.existsSync(testDbPath + '-shm')) fs.unlinkSync(testDbPath + '-shm')
})

beforeEach(() => {
  testDb.exec('DELETE FROM replay_results')
  testDb.exec('DELETE FROM replays')
  testDb.exec('DELETE FROM http_requests')
  testDb.exec('DELETE FROM captures')
})

describe('Database Schema', () => {
  it('should have all required tables', () => {
    const tables = testDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all() as { name: string }[]
    const tableNames = tables.map(t => t.name)

    expect(tableNames).toContain('captures')
    expect(tableNames).toContain('http_requests')
    expect(tableNames).toContain('replays')
    expect(tableNames).toContain('replay_results')
  })

  it('should have replay_summary view', () => {
    const views = testDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='view'"
    ).all() as { name: string }[]
    const viewNames = views.map(v => v.name)

    expect(viewNames).toContain('replay_summary')
  })

  it('should insert and retrieve a capture', () => {
    const id = 'test-capture-1'
    testDb.prepare(`
      INSERT INTO captures (id, name, service_name, target_url)
      VALUES (?, ?, ?, ?)
    `).run(id, 'test-capture', 'my-service', 'http://localhost:3000')

    const row = testDb.prepare('SELECT * FROM captures WHERE id = ?').get(id) as Record<string, unknown>
    expect(row).toBeDefined()
    expect(row.id).toBe(id)
    expect(row.name).toBe('test-capture')
    expect(row.service_name).toBe('my-service')
    expect(row.status).toBe('active')
    expect(row.request_count).toBe(0)
  })

  it('should insert and retrieve an http_request', () => {
    const captureId = 'test-capture-2'
    testDb.prepare(`
      INSERT INTO captures (id, service_name, target_url)
      VALUES (?, ?, ?)
    `).run(captureId, 'svc', 'http://localhost')

    const requestId = 'test-req-1'
    testDb.prepare(`
      INSERT INTO http_requests (id, capture_id, method, url, recorded_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(requestId, captureId, 'GET', '/api/test')

    const row = testDb.prepare('SELECT * FROM http_requests WHERE id = ?').get(requestId) as Record<string, unknown>
    expect(row).toBeDefined()
    expect(row.method).toBe('GET')
    expect(row.url).toBe('/api/test')
    expect(row.capture_id).toBe(captureId)
  })

  it('should enforce foreign key constraints', () => {
    expect(() => {
      testDb.prepare(`
        INSERT INTO http_requests (id, capture_id, method, url, recorded_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run('req-bad', 'nonexistent-capture', 'GET', '/test')
    }).toThrow()
  })
})

describe('Captures Repository', () => {
  it('should create a capture with defaults', () => {
    const id = 'cap-defaults'
    testDb.prepare(`
      INSERT INTO captures (id, service_name, target_url)
      VALUES (?, ?, ?)
    `).run(id, 'service', 'http://target')

    const row = testDb.prepare('SELECT * FROM captures WHERE id = ?').get(id) as Record<string, unknown>
    expect(row.status).toBe('active')
    expect(row.sample_rate).toBe(1.0)
    expect(row.request_count).toBe(0)
  })

  it('should update capture status', () => {
    const id = 'cap-update'
    testDb.prepare(`
      INSERT INTO captures (id, service_name, target_url)
      VALUES (?, ?, ?)
    `).run(id, 'service', 'http://target')

    testDb.prepare("UPDATE captures SET status = 'completed', stopped_at = CURRENT_TIMESTAMP WHERE id = ?").run(id)

    const row = testDb.prepare('SELECT * FROM captures WHERE id = ?').get(id) as Record<string, unknown>
    expect(row.status).toBe('completed')
    expect(row.stopped_at).not.toBeNull()
  })

  it('should list captures with ordering', () => {
    testDb.prepare("INSERT INTO captures (id, service_name, target_url, started_at) VALUES ('cap1', 's', 'http://t', '2024-01-01')").run()
    testDb.prepare("INSERT INTO captures (id, service_name, target_url, started_at) VALUES ('cap2', 's', 'http://t', '2024-01-02')").run()

    const rows = testDb.prepare('SELECT id FROM captures ORDER BY started_at DESC').all() as { id: string }[]
    expect(rows[0].id).toBe('cap2')
    expect(rows[1].id).toBe('cap1')
  })
})

describe('Replays Repository', () => {
  it('should create a replay', () => {
    const capId = 'cap-for-replay'
    testDb.prepare("INSERT INTO captures (id, service_name, target_url) VALUES (?, ?, ?)").run(capId, 's', 'http://t')

    const replayId = 'replay-1'
    testDb.prepare(`
      INSERT INTO replays (id, capture_id, target_url, mode)
      VALUES (?, ?, ?, ?)
    `).run(replayId, capId, 'http://staging', 'paced')

    const row = testDb.prepare('SELECT * FROM replays WHERE id = ?').get(replayId) as Record<string, unknown>
    expect(row.status).toBe('pending')
    expect(row.mode).toBe('paced')
    expect(row.total_requests).toBe(0)
  })

  it('should enforce replay mode constraint', () => {
    const capId = 'cap-for-replay2'
    testDb.prepare("INSERT INTO captures (id, service_name, target_url) VALUES (?, ?, ?)").run(capId, 's', 'http://t')

    expect(() => {
      testDb.prepare(`
        INSERT INTO replays (id, capture_id, target_url, mode)
        VALUES (?, ?, ?, ?)
      `).run('bad-replay', capId, 'http://staging', 'invalid-mode')
    }).toThrow()
  })
})

describe('Replay Results', () => {
  it('should create replay results and query summary', () => {
    const capId = 'cap-for-results'
    const replayId = 'replay-for-results'
    testDb.prepare("INSERT INTO captures (id, service_name, target_url) VALUES (?, ?, ?)").run(capId, 's', 'http://t')
    testDb.prepare("INSERT INTO replays (id, capture_id, target_url) VALUES (?, ?, ?)").run(replayId, capId, 'http://staging')

    testDb.prepare("INSERT INTO http_requests (id, capture_id, method, url, recorded_at) VALUES (?, ?, ?, ?, datetime('now'))").run('req1', capId, 'GET', '/a')
    testDb.prepare("INSERT INTO http_requests (id, capture_id, method, url, recorded_at) VALUES (?, ?, ?, ?, datetime('now'))").run('req2', capId, 'POST', '/b')

    testDb.prepare(`
      INSERT INTO replay_results (id, replay_id, request_id, original_status, replayed_status, body_identical)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('res1', replayId, 'req1', 200, 200, 1)
    testDb.prepare(`
      INSERT INTO replay_results (id, replay_id, request_id, original_status, replayed_status, body_identical)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('res2', replayId, 'req2', 200, 500, 0)

    const summary = testDb.prepare('SELECT * FROM replay_summary WHERE replay_id = ?').get(replayId) as Record<string, unknown>
    expect(summary.total).toBe(2)
    expect(summary.identical).toBe(1)
    expect(summary.status_changed).toBe(1)
    expect(summary.errors).toBe(0)
  })
})
