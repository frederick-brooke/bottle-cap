import config from '../../bottlecap.config'
import type { CaptureSession } from './types'
import { createProxyServer, type ProxyServer } from './server'

function parseBodySize(size: string): number {
  const match = size.match(/^(\d+)(mb|kb|b)?$/i)
  if (!match) return 10 * 1024 * 1024
  const value = parseInt(match[1], 10)
  const unit = (match[2] || 'b').toLowerCase()
  if (unit === 'mb') return value * 1024 * 1024
  if (unit === 'kb') return value * 1024
  return value
}

interface ProxyEntry {
  server: ProxyServer
  port: number
  targetUrl: string
  captureId: string
}

const activeProxies = new Map<string, ProxyEntry>()

export async function startCaptureProxy(
  captureId: string,
  targetUrl: string,
  sampleRate: number,
  listenPort: number
): Promise<number> {
  if (activeProxies.has(captureId)) {
    throw new Error(`Proxy already running for capture ${captureId}`)
  }

  const session: CaptureSession = {
    captureId,
    targetUrl,
    sampleRate,
    listenPort,
    maxBodySize: parseBodySize(config.proxy.maxBodySize),
  }

  const server = createProxyServer(session)
  await server.listen(listenPort)
  const port = server.port()!

  activeProxies.set(captureId, { server, port, targetUrl, captureId })
  return port
}

export async function stopCaptureProxy(captureId: string): Promise<void> {
  const entry = activeProxies.get(captureId)
  if (!entry) return

  await entry.server.close()
  activeProxies.delete(captureId)
}

export function getActiveProxies(): Map<string, { port: number; targetUrl: string; captureId: string }> {
  const result = new Map<string, { port: number; targetUrl: string; captureId: string }>()
  for (const [id, entry] of activeProxies) {
    result.set(id, { port: entry.port, targetUrl: entry.targetUrl, captureId: entry.captureId })
  }
  return result
}

export function getProxyPort(captureId: string): number | null {
  return activeProxies.get(captureId)?.port ?? null
}
