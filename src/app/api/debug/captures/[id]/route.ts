import { NextResponse } from 'next/server'
import { getCapture } from '@/storage/repositories/captures'
import { getDatabase } from '@/storage/database'
import type { HttpRequest } from '@/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const capture = getCapture(id)

  if (!capture) {
    return NextResponse.json({ error: 'Capture not found' }, { status: 404 })
  }

  const db = getDatabase()
  const rows = db.prepare(
    'SELECT * FROM http_requests WHERE capture_id = ? ORDER BY recorded_at DESC LIMIT 200'
  ).all(id) as Record<string, unknown>[]

  const requests: HttpRequest[] = rows.map(row => ({
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
  }))

  return NextResponse.json({ capture, requests })
}
