import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database'
import type { ReplayResult, ReplaySummary } from '../../types'

export interface CreateResultInput {
  replay_id: string
  request_id: string
  original_status: number | null
  replayed_status: number | null
  original_latency_ms: number | null
  replayed_latency_ms: number | null
  body_diff_summary?: Record<string, unknown> | null
  body_identical: boolean | null
  truncated?: boolean | null
  error?: string | null
}

export function createResult(input: CreateResultInput): ReplayResult {
  const db = getDatabase()
  const id = uuid()
  const stmt = db.prepare(`
    INSERT INTO replay_results (id, replay_id, request_id, original_status, replayed_status,
      original_latency_ms, replayed_latency_ms, body_diff_summary, body_identical, truncated, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    id,
    input.replay_id,
    input.request_id,
    input.original_status,
    input.replayed_status,
    input.original_latency_ms,
    input.replayed_latency_ms,
    input.body_diff_summary ? JSON.stringify(input.body_diff_summary) : null,
    input.body_identical,
    input.truncated ? 1 : 0,
    input.error ?? null,
  )
  return getResult(id)!
}

export function getResult(id: string): ReplayResult | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM replay_results WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) return null
  return mapRowToResult(row)
}

export function getResultsByReplay(replayId: string): ReplayResult[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM replay_results WHERE replay_id = ? ORDER BY replayed_at').all(replayId) as Record<string, unknown>[]
  return rows.map(mapRowToResult)
}

export function getReplaySummary(replayId: string): ReplaySummary | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM replay_summary WHERE replay_id = ?').get(replayId) as Record<string, unknown> | undefined
  if (!row) return null
  return {
    replay_id: row.replay_id as string,
    name: row.name as string | null,
    status: row.status as string,
    mode: row.mode as string,
    total: row.total as number,
    identical: row.identical as number,
    status_changed: row.status_changed as number,
    errors: row.errors as number,
    avg_latency_delta_ms: row.avg_latency_delta_ms as number | null,
  }
}

function mapRowToResult(row: Record<string, unknown>): ReplayResult {
  return {
    id: row.id as string,
    replay_id: row.replay_id as string,
    request_id: row.request_id as string,
    original_status: row.original_status as number | null,
    replayed_status: row.replayed_status as number | null,
    original_latency_ms: row.original_latency_ms as number | null,
    replayed_latency_ms: row.replayed_latency_ms as number | null,
    body_diff_summary: row.body_diff_summary ? JSON.parse(row.body_diff_summary as string) : null,
    body_identical: row.body_identical === 1 || row.body_identical === true,
    truncated: row.truncated === 1 || row.truncated === true,
    error: row.error as string | null,
    replayed_at: row.replayed_at as string,
  }
}
