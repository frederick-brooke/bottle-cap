import http from 'http'
import net from 'net'
import httpProxy from 'http-proxy'
import chalk from 'chalk'
import { v4 as uuid } from 'uuid'
import type { CaptureSession } from './types'
import { shouldSample } from './middleware/sampler'
import { sanitizeHeaders } from './middleware/sanitizer'
import { captureBody, insertHttpRequest } from './capture'

interface CaptureData {
  startTime: number
  method: string
  url: string
  headers: Record<string, string>
  body: Buffer | null
  traceId: string | null
  serviceVersion: string | null
}

export interface ProxyServer {
  listen: (port: number) => Promise<void>
  close: () => Promise<void>
  onRequest: (cb: (req: http.IncomingMessage, res: http.ServerResponse) => void) => void
  onCapture: (cb: (data: { requestId: string; method: string; url: string }) => void) => void
  port: () => number | null
}

export function createProxyServer(session: CaptureSession): ProxyServer {
  const proxy = httpProxy.createProxyServer({
    target: session.targetUrl,
    changeOrigin: true,
    selfHandleResponse: true,
  })

  let captureCallback: ((data: { requestId: string; method: string; url: string }) => void) | null = null
  let httpServer: http.Server | null = null
  let listeningPort: number | null = null

  function extractTraceId(headers: Record<string, string>): string | null {
    return headers['x-request-id']
      ?? headers['x-trace-id']
      ?? headers['traceparent']
      ?? null
  }

  function extractServiceVersion(headers: Record<string, string>): string | null {
    return headers['x-service-version']
      ?? headers['x-app-version']
      ?? headers['x-version']
      ?? null
  }

  proxy.on('proxyReq', (proxyReq, req) => {
    const startTime = Date.now()
    const chunks: Buffer[] = []

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    req.on('end', () => {
      const body = chunks.length > 0 ? Buffer.concat(chunks) : null

      const sanitizedHeaders = sanitizeHeaders(req.headers as Record<string, string>)

      const captureData: CaptureData = {
        startTime,
        method: req.method!,
        url: req.url!,
        headers: sanitizedHeaders,
        body,
        traceId: extractTraceId(sanitizedHeaders),
        serviceVersion: extractServiceVersion(sanitizedHeaders),
      }
      ;(req as http.IncomingMessage & { _captureData?: CaptureData })._captureData = captureData
    })

    proxyReq.on('error', (err) => {
      console.error(chalk.red(`Proxy request error: ${err.message}`))
    })
  })

  proxy.on('proxyRes', (proxyRes, req, res) => {
    const captureData = (req as http.IncomingMessage & { _captureData?: CaptureData })._captureData

    if (!captureData) {
      const chunks: Buffer[] = []
      proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk))
      proxyRes.on('end', () => {
        const body = Buffer.concat(chunks)
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
        res.end(body)
      })
      return
    }

    const chunks: Buffer[] = []
    proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk))
    proxyRes.on('end', async () => {
      const responseBuffer = Buffer.concat(chunks)
      const latencyMs = Date.now() - captureData.startTime

      if (shouldSample(captureData.url, {
        rate: session.sampleRate,
      })) {
        try {
          const requestId = uuid()
          const responseHeaders: Record<string, string> = {}
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value !== undefined) {
              responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value
            }
          }

          const requestBody = captureData.body && captureData.body.length > 0
            ? await captureBody(captureData.body, session.captureId, requestId, 'request')
            : null

          const responseBody = responseBuffer.length > 0
            ? await captureBody(responseBuffer, session.captureId, requestId, 'response')
            : null

          insertHttpRequest({
            captureId: session.captureId,
            method: captureData.method,
            url: captureData.url,
            headers: captureData.headers,
            requestBody,
            statusCode: proxyRes.statusCode ?? null,
            responseHeaders,
            responseBody,
            latencyMs,
            traceId: captureData.traceId,
            serviceVersion: captureData.serviceVersion,
            recordedAt: new Date().toISOString(),
          })

          if (captureCallback) {
            captureCallback({ requestId, method: captureData.method, url: captureData.url })
          }
        } catch (err) {
          console.error(chalk.red(`Capture failed: ${(err as Error).message}`))
        }
      }

      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
      res.end(responseBuffer)
    })
  })

  proxy.on('error', (err, req, res) => {
    console.error(chalk.red(`Proxy error: ${err.message}`))
    if ('writeHead' in res && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
    }
    if ('end' in res) {
      res.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }))
    }
  })

  return {
    listen: (port: number) => new Promise<void>((resolve, reject) => {
      httpServer = http.createServer((req, res) => {
        proxy.web(req, res)
      })

      httpServer.on('error', reject)
      httpServer.listen(port, () => {
        const addr = httpServer!.address() as net.AddressInfo
        listeningPort = addr.port
        console.log(chalk.green(`Proxy listening on port ${listeningPort}`))
        console.log(chalk.gray(`Target: ${session.targetUrl}`))
        console.log(chalk.gray(`Sample rate: ${(session.sampleRate * 100).toFixed(0)}%`))
        resolve()
      })
    }),

    close: () => new Promise<void>((resolve) => {
      if (httpServer) {
        httpServer.close(() => resolve())
        httpServer = null
        listeningPort = null
      } else {
        resolve()
      }
    }),

    onRequest: (cb) => {
      httpServer?.on('request', cb)
    },

    onCapture: (cb) => {
      captureCallback = cb
    },

    port: () => listeningPort,
  }
}
