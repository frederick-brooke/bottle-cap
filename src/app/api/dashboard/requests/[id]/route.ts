import { NextResponse } from 'next/server'
import { getDatabase } from '@/storage/database'
import { getObject } from '@/storage/object-store'
import type { HttpRequest } from '@/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 })
  }

  const db = getDatabase()
  const row = db.prepare('SELECT * FROM http_requests WHERE id = ?').get(id) as Record<string, unknown> | undefined

  if (!row) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const request: HttpRequest = {
    id: row.id as string,
    capture_id: row.capture_id as string,
    trace_id: row.trace_id as string | null,
    method: row.method as string,
    url: row.url as string,
    headers: row.headers ? JSON.parse(row.headers as string) : null,
    request_body_key: row.request_body_key as string | null,
    request_body_preview: row.request_body_preview as string | null,
    status_code: row.status_code as number | null,
    response_headers: row.response_headers ? JSON.parse(row.response_headers as string) : null,
    response_body_key: row.response_body_key as string | null,
    response_body_preview: row.response_body_preview as string | null,
    latency_ms: row.latency_ms as number | null,
    service_version: row.service_version as string | null,
    recorded_at: row.recorded_at as string,
    created_at: row.created_at as string,
  }

  let requestBody: string | null = null
  let responseBody: string | null = null

  if (request.request_body_key) {
    if (request.request_body_key.startsWith('captures/')) {
      try {
        const buf = await getObject(request.request_body_key)
        requestBody = buf.toString('utf-8')
      } catch {
        requestBody = '[S3 body unavailable]'
      }
    } else {
      requestBody = request.request_body_key
    }
  }

  if (request.response_body_key) {
    if (request.response_body_key.startsWith('captures/')) {
      try {
        const buf = await getObject(request.response_body_key)
        responseBody = buf.toString('utf-8')
      } catch {
        responseBody = '[S3 body unavailable]'
      }
    } else {
      responseBody = request.response_body_key
    }
  }

  return NextResponse.json({ request, requestBody, responseBody })
}
