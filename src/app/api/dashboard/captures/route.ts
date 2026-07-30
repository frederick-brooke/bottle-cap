import { NextResponse } from 'next/server'
import { listCaptures } from '@/storage/repositories/captures'
import { getActiveProxies } from '@/proxy/manager'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = Math.max(0, parseInt(url.searchParams.get('limit') || '50', 10))
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10))

  const captures = listCaptures({ limit, offset })
  const active = getActiveProxies()

  const enriched = captures.map(c => ({
    ...c,
    isActive: active.has(c.id),
    proxyPort: active.get(c.id)?.port ?? null,
  }))

  return NextResponse.json({ captures: enriched })
}
