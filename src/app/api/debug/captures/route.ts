import { NextResponse } from 'next/server'
import { createCapture, listCaptures } from '@/storage/repositories/captures'
import { startCaptureProxy, getActiveProxies } from '@/proxy/manager'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)

  const captures = listCaptures({ limit })
  const active = getActiveProxies()

  const enriched = captures.map(c => ({
    ...c,
    isActive: active.has(c.id),
    proxyPort: active.get(c.id)?.port ?? null,
  }))

  return NextResponse.json({ captures: enriched })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, serviceName, targetUrl, sampleRate, port } = body

    if (!serviceName || !targetUrl) {
      return NextResponse.json(
        { error: 'serviceName and targetUrl are required' },
        { status: 400 }
      )
    }

    const capture = createCapture({
      name: name || null,
      service_name: serviceName,
      target_url: targetUrl,
      sample_rate: sampleRate ?? 1.0,
    })

    const listenPort = port ?? 8080
    const actualPort = await startCaptureProxy(
      capture.id,
      targetUrl,
      sampleRate ?? 1.0,
      listenPort
    )

    return NextResponse.json({ capture, listenPort: actualPort })
  } catch (err) {
    const message = (err as Error).message
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
