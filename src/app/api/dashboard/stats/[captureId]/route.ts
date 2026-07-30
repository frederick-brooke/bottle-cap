import { NextResponse } from 'next/server'
import { getCapture } from '@/storage/repositories/captures'
import { listReplaysByCapture } from '@/storage/repositories/replays'
import { getReplaySummariesByReplayIds } from '@/storage/repositories/results'
import { getDatabase } from '@/storage/database'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ captureId: string }> }
) {
  const { captureId } = await params

  if (!UUID_RE.test(captureId)) {
    return NextResponse.json({ error: 'Invalid capture ID' }, { status: 400 })
  }

  const capture = getCapture(captureId)
  if (!capture) {
    return NextResponse.json({ error: 'Capture not found' }, { status: 404 })
  }

  const db = getDatabase()
  const requestCount = (db.prepare(
    'SELECT COUNT(*) as count FROM http_requests WHERE capture_id = ?'
  ).get(captureId) as { count: number }).count

  const replays = listReplaysByCapture(captureId)
  const replayIds = replays.map(r => r.id)
  const summaries = getReplaySummariesByReplayIds(replayIds)

  const replaysWithSummary = replays.map(r => ({
    ...r,
    summary: summaries.get(r.id) ?? null,
  }))

  return NextResponse.json({
    capture,
    requestCount,
    replays: replaysWithSummary,
  })
}
