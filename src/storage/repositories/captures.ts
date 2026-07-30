import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database'
import type { Capture } from '../../types'

export interface CreateCaptureInput {
  name?: string
  service_name: string
  target_url: string
  sample_rate?: number
  config?: Record<string, unknown>
}

export function createCapture(input: CreateCaptureInput): Capture {
  const db = getDatabase()
  const id = uuid()
  const stmt = db.prepare(`
    INSERT INTO captures (id, name, service_name, target_url, sample_rate, config)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    id,
    input.name ?? null,
    input.service_name,
    input.target_url,
    input.sample_rate ?? 1.0,
    input.config ? JSON.stringify(input.config) : null
  )
  return getCapture(id)!
}

export function getCapture(id: string): Capture | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM captures WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) return null
  return mapRowToCapture(row)
}

export function listCaptures(options?: { limit?: number; offset?: number }): Capture[] {
  const db = getDatabase()
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0
  const rows = db.prepare('SELECT * FROM captures ORDER BY started_at DESC LIMIT ? OFFSET ?').all(limit, offset) as Record<string, unknown>[]
  return rows.map(mapRowToCapture)
}

export function updateCaptureStatus(id: string, status: Capture['status']): Capture | null {
  const db = getDatabase()
  const updates: string[] = ['status = ?']
  const params: unknown[] = [status]

  if (status === 'completed') {
    updates.push('stopped_at = CURRENT_TIMESTAMP')
  }

  db.prepare(`UPDATE captures SET ${updates.join(', ')} WHERE id = ?`).run(...params, id)
  return getCapture(id)
}

export function incrementRequestCount(id: string): void {
  const db = getDatabase()
  db.prepare('UPDATE captures SET request_count = request_count + 1 WHERE id = ?').run(id)
}

export function deleteCapture(id: string): boolean {
  const db = getDatabase()
  db.pragma('foreign_keys = OFF')
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM replay_results WHERE replay_id IN (SELECT id FROM replays WHERE capture_id = ?)').run(id)
      db.prepare('DELETE FROM replays WHERE capture_id = ?').run(id)
      db.prepare('DELETE FROM http_requests WHERE capture_id = ?').run(id)
      const result = db.prepare('DELETE FROM captures WHERE id = ?').run(id)
      return result.changes > 0
    })()
    return true
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

function mapRowToCapture(row: Record<string, unknown>): Capture {
  return {
    id: row.id as string,
    name: row.name as string | null,
    status: row.status as Capture['status'],
    service_name: row.service_name as string,
    target_url: row.target_url as string,
    sample_rate: row.sample_rate as number,
    started_at: row.started_at as string,
    stopped_at: row.stopped_at as string | null,
    request_count: row.request_count as number,
    config: row.config ? JSON.parse(row.config as string) : null,
  }
}
