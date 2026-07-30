import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database'
import type { Replay } from '../../types'

export interface CreateReplayInput {
  name?: string
  capture_id: string
  target_url: string
  mode?: Replay['mode']
  rate_limit?: number
  config?: Record<string, unknown>
  triggered_by?: string
}

export function createReplay(input: CreateReplayInput): Replay {
  const db = getDatabase()
  const id = uuid()
  const stmt = db.prepare(`
    INSERT INTO replays (id, name, capture_id, target_url, mode, rate_limit, config, triggered_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    id,
    input.name ?? null,
    input.capture_id,
    input.target_url,
    input.mode ?? 'paced',
    input.rate_limit ?? null,
    input.config ? JSON.stringify(input.config) : null,
    input.triggered_by ?? null
  )
  return getReplay(id)!
}

export function getReplay(id: string): Replay | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM replays WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) return null
  return mapRowToReplay(row)
}

export function listReplays(options?: { limit?: number; offset?: number }): Replay[] {
  const db = getDatabase()
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0
  const rows = db.prepare('SELECT * FROM replays ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as Record<string, unknown>[]
  return rows.map(mapRowToReplay)
}

export function listReplaysByCapture(captureId: string): Replay[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM replays WHERE capture_id = ? ORDER BY created_at DESC').all(captureId) as Record<string, unknown>[]
  return rows.map(mapRowToReplay)
}

export function updateReplayStatus(id: string, status: Replay['status']): Replay | null {
  const db = getDatabase()
  const updates: string[] = ['status = ?']
  const params: unknown[] = [status]

  if (status === 'running') {
    updates.push('started_at = CURRENT_TIMESTAMP')
  } else if (status === 'completed' || status === 'failed') {
    updates.push('completed_at = CURRENT_TIMESTAMP')
  }

  db.prepare(`UPDATE replays SET ${updates.join(', ')} WHERE id = ?`).run(...params, id)
  return getReplay(id)
}

export function incrementReplayProgress(id: string): Replay | null {
  const db = getDatabase()
  db.prepare('UPDATE replays SET completed_requests = completed_requests + 1 WHERE id = ?').run(id)
  return getReplay(id)
}

function mapRowToReplay(row: Record<string, unknown>): Replay {
  return {
    id: row.id as string,
    name: row.name as string | null,
    capture_id: row.capture_id as string,
    status: row.status as Replay['status'],
    target_url: row.target_url as string,
    mode: row.mode as Replay['mode'],
    rate_limit: row.rate_limit as number | null,
    config: row.config ? JSON.parse(row.config as string) : null,
    started_at: row.started_at as string | null,
    completed_at: row.completed_at as string | null,
    total_requests: row.total_requests as number,
    completed_requests: row.completed_requests as number,
    created_at: row.created_at as string,
    triggered_by: row.triggered_by as string | null,
  }
}
