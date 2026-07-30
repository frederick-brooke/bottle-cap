import { NextResponse } from 'next/server'
import { listReplays, createReplay } from '@/storage/repositories/replays'
import { getReplaySummariesByReplayIds } from '@/storage/repositories/results'
import { runReplay } from '@/replay/engine'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = Math.max(0, parseInt(url.searchParams.get('limit') || '50', 10))
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10))

  const replays = listReplays({ limit, offset })
  const replayIds = replays.map(r => r.id)
  const summaries = getReplaySummariesByReplayIds(replayIds)

  const replaysWithSummary = replays.map(r => ({
    ...r,
    summary: summaries.get(r.id) ?? null,
  }))

  return NextResponse.json({ replays: replaysWithSummary })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, captureId, targetUrl, mode, rateLimit } = body

    if (!captureId) {
      return NextResponse.json({ error: 'captureId is required' }, { status: 400 })
    }
    if (!targetUrl) {
      return NextResponse.json({ error: 'targetUrl is required' }, { status: 400 })
    }
    if (mode && !['paced', 'burst', 'throttled'].includes(mode)) {
      return NextResponse.json(
        { error: 'mode must be one of: paced, burst, throttled' },
        { status: 400 }
      )
    }
    if (mode === 'throttled' && (!rateLimit || typeof rateLimit !== 'number' || rateLimit <= 0)) {
      return NextResponse.json(
        { error: 'rateLimit must be a positive integer for throttled mode' },
        { status: 400 }
      )
    }

    const replay = createReplay({
      name: name || null,
      capture_id: captureId,
      target_url: targetUrl,
      mode: mode || 'paced',
      rate_limit: rateLimit ?? null,
      triggered_by: 'dashboard',
    })

    // Fire-and-forget: start replay execution in background
    runReplay(replay.id).catch(() => {})

    return NextResponse.json({ replay }, { status: 201 })
  } catch (err) {
    const message = (err as Error).message
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
