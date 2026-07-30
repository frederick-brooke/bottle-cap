import { NextResponse } from 'next/server'
import { getDatabase } from '@/storage/database'

export async function GET() {
  const db = getDatabase()

  const captureCount = (db.prepare('SELECT COUNT(*) as count FROM captures').get() as { count: number }).count
  const replayCount = (db.prepare('SELECT COUNT(*) as count FROM replays').get() as { count: number }).count
  const completedReplays = (db.prepare("SELECT COUNT(*) as count FROM replays WHERE status = 'completed'").get() as { count: number }).count
  const failedReplays = (db.prepare("SELECT COUNT(*) as count FROM replays WHERE status = 'failed'").get() as { count: number }).count
  const activeCaptures = (db.prepare("SELECT COUNT(*) as count FROM captures WHERE status = 'active'").get() as { count: number }).count

  const recentCaptures = db.prepare(
    'SELECT id, name, status, service_name, request_count, started_at FROM captures ORDER BY started_at DESC LIMIT 5'
  ).all() as Record<string, unknown>[]

  const recentReplays = db.prepare(
    'SELECT id, name, status, mode, capture_id, created_at FROM replays ORDER BY created_at DESC LIMIT 5'
  ).all() as Record<string, unknown>[]

  return NextResponse.json({
    stats: {
      totalCaptures: captureCount,
      activeCaptures,
      totalReplays: replayCount,
      completedReplays,
      failedReplays,
      successRate: replayCount > 0 ? Math.round((completedReplays / replayCount) * 100) : 0,
    },
    recentCaptures: recentCaptures.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      service_name: r.service_name,
      request_count: r.request_count,
      started_at: r.started_at,
    })),
    recentReplays: recentReplays.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      mode: r.mode,
      capture_id: r.capture_id,
      created_at: r.created_at,
    })),
  })
}
