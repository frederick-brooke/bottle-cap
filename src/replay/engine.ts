import { getDatabase } from '@/storage/database'
import { getReplay, updateReplayStatus, incrementReplayProgress } from '@/storage/repositories/replays'
import { createResult, getReplaySummary } from '@/storage/repositories/results'
import type { HttpRequest, ReplaySummary } from '@/types'
import { createSender } from './sender'
import { createMode } from './modes'
import { compareResponses } from '@/diff/comparator'
import type { ReplayOptions, SendResult } from './types'
import config from '../../bottlecap.config'

function safeJsonParse(str: string): unknown {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

function loadRequests(captureId: string): HttpRequest[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM http_requests WHERE capture_id = ? ORDER BY recorded_at')
    .all(captureId) as Record<string, unknown>[]
  return rows.map((row) => ({
    id: row.id as string,
    capture_id: row.capture_id as string,
    trace_id: row.trace_id as string | null,
    method: row.method as string,
    url: row.url as string,
    headers: row.headers ? safeJsonParse(row.headers as string) as Record<string, string> | null : null,
    request_body_key: row.request_body_key as string | null,
    request_body_preview: row.request_body_preview as string | null,
    status_code: row.status_code as number | null,
    response_headers: row.response_headers ? safeJsonParse(row.response_headers as string) as Record<string, string> | null : null,
    response_body_key: row.response_body_key as string | null,
    response_body_preview: row.response_body_preview as string | null,
    latency_ms: row.latency_ms as number | null,
    service_version: row.service_version as string | null,
    recorded_at: row.recorded_at as string,
    created_at: row.created_at as string,
  }))
}

export async function runReplay(
  replayId: string,
  onProgress?: (completed: number, total: number) => void,
  overrides?: { rejectUnauthorized?: boolean },
): Promise<ReplaySummary | null> {
  const replay = getReplay(replayId)
  if (!replay) throw new Error(`Replay not found: ${replayId}`)
  if (replay.status !== 'pending') {
    throw new Error(`Replay cannot be run (status: ${replay.status})`)
  }

  updateReplayStatus(replayId, 'running')

  const requests = loadRequests(replay.capture_id)
  const requestMap = new Map(requests.map((r) => [r.id, r]))

  const db = getDatabase()
  db.prepare('UPDATE replays SET total_requests = ? WHERE id = ?').run(requests.length, replayId)

  const options: ReplayOptions = {
    replayId,
    captureId: replay.capture_id,
    targetUrl: replay.target_url,
    mode: replay.mode,
    rateLimit: replay.rate_limit ?? undefined,
    timeout: config.replay.defaultTimeout,
    maxConcurrent: config.replay.maxConcurrent,
    rejectUnauthorized: overrides?.rejectUnauthorized ?? config.replay.rejectUnauthorized,
  }

  const mode = createMode(replay.mode)
  const send = createSender(options)

  let completedCount = 0
  const shouldStop = () => {
    const current = getReplay(replayId)
    return current?.status !== 'running'
  }

  const onResult = (result: SendResult) => {
    try {
      const request = requestMap.get(result.requestId)
      const originalBody = request?.response_body_key
        ? (request.response_body_key.startsWith('captures/') ? null : request.response_body_key)
        : null

      const diffResult = compareResponses({
        originalBody,
        replayedBody: result.body,
        originalLatencyMs: request?.latency_ms ?? null,
        replayedLatencyMs: result.latencyMs,
      })

      createResult({
        replay_id: replayId,
        request_id: result.requestId,
        original_status: request?.status_code ?? null,
        replayed_status: result.statusCode,
        original_latency_ms: request?.latency_ms ?? null,
        replayed_latency_ms: result.latencyMs,
        body_diff_summary: diffResult.bodyDiffSummary as unknown as Record<string, unknown>,
        body_identical: diffResult.bodyIdentical ? 1 : 0,
        truncated: result.truncated,
        error: result.error,
      })

      incrementReplayProgress(replayId)
      completedCount++
      onProgress?.(completedCount, requests.length)
    } catch {
      updateReplayStatus(replayId, 'failed')
    }
  }

  try {
    await mode.execute(requests, send, options, onResult, shouldStop)

    if (!shouldStop()) {
      updateReplayStatus(replayId, 'completed')
    }
  } catch (err) {
    updateReplayStatus(replayId, 'failed')
    throw err
  }

  return getReplaySummary(replayId)
}
