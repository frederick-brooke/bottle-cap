import { NextResponse } from 'next/server'
import { getReplay, updateReplayStatus } from '@/storage/repositories/replays'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid replay ID' }, { status: 400 })
  }

  const replay = getReplay(id)
  if (!replay) {
    return NextResponse.json({ error: 'Replay not found' }, { status: 404 })
  }

  if (replay.status !== 'pending' && replay.status !== 'running') {
    return NextResponse.json(
      { error: `Replay cannot be cancelled (status: ${replay.status})` },
      { status: 409 }
    )
  }

  const updated = updateReplayStatus(id, 'failed')
  return NextResponse.json({ replay: updated })
}
