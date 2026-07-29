import http from 'http'
import net from 'net'

export interface MockTarget {
  port: number
  url: string
  close: () => Promise<void>
  lastRequest: () => { method: string; url: string; headers: Record<string, string>; body: string } | null
}

export function createMockTarget(): Promise<MockTarget> {
  let lastReq: { method: string; url: string; headers: Record<string, string>; body: string } | null = null

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      lastReq = {
        method: req.method || 'GET',
        url: req.url || '/',
        headers: req.headers as Record<string, string>,
        body: Buffer.concat(chunks).toString('utf-8'),
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'x-mock': 'true' })
      res.end(JSON.stringify({ echo: lastReq }))
    })
  })

  return new Promise((resolve) => {
    server.listen(0, () => {
      const addr = server.address() as net.AddressInfo
      resolve({
        port: addr.port,
        url: `http://localhost:${addr.port}`,
        close: () => new Promise<void>((r) => server.close(() => r())),
        lastRequest: () => lastReq,
      })
    })
  })
}

export function createSlowMockTarget(delayMs: number): Promise<MockTarget> {
  let lastReq: { method: string; url: string; headers: Record<string, string>; body: string } | null = null

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      lastReq = {
        method: req.method || 'GET',
        url: req.url || '/',
        headers: req.headers as Record<string, string>,
        body: Buffer.concat(chunks).toString('utf-8'),
      }
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ echo: lastReq }))
      }, delayMs)
    })
  })

  return new Promise((resolve) => {
    server.listen(0, () => {
      const addr = server.address() as net.AddressInfo
      resolve({
        port: addr.port,
        url: `http://localhost:${addr.port}`,
        close: () => new Promise<void>((r) => server.close(() => r())),
        lastRequest: () => lastReq,
      })
    })
  })
}
