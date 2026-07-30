import http from 'http'
import https from 'https'
import type { HttpRequest } from '@/types'
import { getObject } from '@/storage/object-store'
import type { ReplayOptions, SendResult } from './types'

const MAX_RESPONSE_BODY = 1024 * 1024

export async function getRequestBody(request: HttpRequest): Promise<Buffer | null> {
  if (!request.request_body_key) return null
  if (request.request_body_key.startsWith('captures/')) {
    try {
      return await getObject(request.request_body_key)
    } catch {
      return null
    }
  }
  return Buffer.from(request.request_body_key, 'utf-8')
}

export function rewriteUrl(originalUrl: string, targetUrl: string): string {
  const original = new URL(originalUrl)
  const target = new URL(targetUrl)
  original.protocol = target.protocol
  original.host = target.host
  return original.toString()
}

export function createSender(options: ReplayOptions) {
  const url = new URL(options.targetUrl)
  const isHttps = url.protocol === 'https:'
  const agent = isHttps
    ? new https.Agent({ rejectUnauthorized: options.rejectUnauthorized, keepAlive: true })
    : new http.Agent({ keepAlive: true })

  return async (request: HttpRequest): Promise<SendResult> => {
    const startTime = Date.now()
    try {
      const targetUrl = rewriteUrl(request.url, options.targetUrl)
      const reqUrl = new URL(targetUrl)

      const body = await getRequestBody(request)
      const headers: Record<string, string> = {}
      if (request.headers) {
        for (const [key, value] of Object.entries(request.headers)) {
          if (key.toLowerCase() === 'host') continue
          headers[key] = value
        }
      }
      headers['host'] = reqUrl.host

      const transport = isHttps ? https : http

      const result = await new Promise<SendResult>((resolve) => {
        let settled = false
        const settle = (res: SendResult) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          resolve(res)
        }

        const timer = setTimeout(() => {
          settle({
            requestId: request.id,
            statusCode: null,
            headers: null,
            body: null,
            latencyMs: Date.now() - startTime,
            error: `Request timed out after ${options.timeout}ms`,
            truncated: false,
          })
        }, options.timeout)

        const req = transport.request(
          {
            hostname: reqUrl.hostname,
            port: reqUrl.port || (isHttps ? 443 : 80),
            path: reqUrl.pathname + reqUrl.search,
            method: request.method,
            headers,
            agent,
            timeout: options.timeout,
          },
          (res) => {
            const chunks: Buffer[] = []
            let responseSize = 0
            res.on('data', (chunk: Buffer) => {
              responseSize += chunk.length
              if (responseSize <= MAX_RESPONSE_BODY) {
                chunks.push(chunk)
              }
            })
            res.on('end', () => {
              const latencyMs = Date.now() - startTime
              const responseHeaders: Record<string, string> = {}
              for (const [key, value] of Object.entries(res.headers)) {
                if (typeof value === 'string') {
                  responseHeaders[key] = value
                } else if (Array.isArray(value)) {
                  responseHeaders[key] = value.join(', ')
                }
              }
              settle({
                requestId: request.id,
                statusCode: res.statusCode ?? null,
                headers: responseHeaders,
                body: Buffer.concat(chunks).toString('utf-8'),
                latencyMs,
                error: responseSize > MAX_RESPONSE_BODY ? 'Response body truncated' : null,
                truncated: responseSize > MAX_RESPONSE_BODY,
              })
            })
            res.on('error', (err) => {
              settle({
                requestId: request.id,
                statusCode: null,
                headers: null,
                body: null,
                latencyMs: Date.now() - startTime,
                error: err.message,
                truncated: false,
              })
            })
          },
        )

        req.on('error', (err) => {
          settle({
            requestId: request.id,
            statusCode: null,
            headers: null,
            body: null,
            latencyMs: Date.now() - startTime,
            error: err.message,
            truncated: false,
          })
        })

        req.on('timeout', () => {
          req.destroy()
          settle({
            requestId: request.id,
            statusCode: null,
            headers: null,
            body: null,
            latencyMs: Date.now() - startTime,
            error: `Request timed out after ${options.timeout}ms`,
            truncated: false,
          })
        })

        if (body && body.length > 0) {
          req.write(body)
        }
        req.end()
      })

      return result
    } catch (err) {
      return {
        requestId: request.id,
        statusCode: null,
        headers: null,
        body: null,
        latencyMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
        truncated: false,
      }
    }
  }
}
