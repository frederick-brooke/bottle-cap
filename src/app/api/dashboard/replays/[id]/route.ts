import { NextResponse } from 'next/server'
import { getReplay } from '@/storage/repositories/replays'
import { getReplaySummary } from '@/storage/repositories/results'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
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

  const summary = getReplaySummary(id)

  return NextResponse.json({ replay, summary })
}
