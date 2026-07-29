import { NextResponse } from 'next/server'
import { getCapture, updateCaptureStatus } from '@/storage/repositories/captures'
import { stopCaptureProxy } from '@/proxy/manager'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const capture = getCapture(id)

  if (!capture) {
    return NextResponse.json({ error: 'Capture not found' }, { status: 404 })
  }

  if (capture.status !== 'active') {
    return NextResponse.json(
      { error: `Capture is not active (status: ${capture.status})` },
      { status: 400 }
    )
  }

  await stopCaptureProxy(id)
  const updated = updateCaptureStatus(id, 'completed')

  return NextResponse.json({ capture: updated })
}
