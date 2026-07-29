import { v4 as uuid } from 'uuid'
import type Database from 'better-sqlite3'
import { getDatabase } from '../storage/database'
import { putObject } from '../storage/object-store'
import type { CapturedBody } from './types'
import { BODY_PREVIEW_LENGTH, INLINE_BODY_THRESHOLD } from './types'

const s3Available = new Map<string, boolean>()

async function checkS3Available(): Promise<boolean> {
  const key = '__probe__'
  if (s3Available.has(key)) return s3Available.get(key)!
  try {
    await putObject(key, Buffer.alloc(0))
    s3Available.set(key, true)
    return true
  } catch {
    s3Available.set(key, false)
    return false
  }
}

function makePreview(buffer: Buffer): string {
  return buffer.toString('utf-8').slice(0, BODY_PREVIEW_LENGTH)
}

function makeS3Key(captureId: string, requestId: string, type: 'request' | 'response'): string {
  return `captures/${captureId}/requests/${requestId}/${type}`
}

export async function captureBody(
  buffer: Buffer,
  captureId: string,
  requestId: string,
  type: 'request' | 'response'
): Promise<CapturedBody> {
  const preview = makePreview(buffer)
  const key = makeS3Key(captureId, requestId, type)

  if (buffer.length <= INLINE_BODY_THRESHOLD) {
    return { buffer, preview, s3Key: null }
  }

  try {
    const available = await checkS3Available()
    if (available) {
      await putObject(key, buffer)
      return { buffer, preview, s3Key: key }
    }
  } catch (err) {
    console.warn(`S3 unavailable, storing body inline in SQLite: ${(err as Error).message}`)
  }

  return { buffer, preview, s3Key: null }
}

export function insertHttpRequest(params: {
  captureId: string
  method: string
  url: string
  headers: Record<string, string>
  requestBody: CapturedBody | null
  statusCode: number | null
  responseHeaders: Record<string, string> | null
  responseBody: CapturedBody | null
  latencyMs: number | null
  traceId: string | null
  serviceVersion: string | null
  recordedAt: string
  db?: Database.Database
}): string {
  const db = params.db ?? getDatabase()
  const id = uuid()

  db.prepare(`
    INSERT INTO http_requests (
      id, capture_id, trace_id, method, url, headers,
      request_body_key, request_body_preview,
      status_code, response_headers,
      response_body_key, response_body_preview,
      latency_ms, service_version, recorded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.captureId,
    params.traceId,
    params.method,
    params.url,
    params.headers ? JSON.stringify(params.headers) : null,
    params.requestBody?.s3Key ?? (params.requestBody?.buffer.toString('utf-8') ?? null),
    params.requestBody?.preview ?? null,
    params.statusCode,
    params.responseHeaders ? JSON.stringify(params.responseHeaders) : null,
    params.responseBody?.s3Key ?? (params.responseBody?.buffer.toString('utf-8') ?? null),
    params.responseBody?.preview ?? null,
    params.latencyMs,
    params.serviceVersion,
    params.recordedAt
  )

  db.prepare('UPDATE captures SET request_count = request_count + 1 WHERE id = ?').run(params.captureId)
  return id
}
