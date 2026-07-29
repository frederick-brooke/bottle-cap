import { NextResponse } from 'next/server'
import http from 'http'
import { getProxyPort } from '@/proxy/manager'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { captureId, method, path, headers, body: reqBody } = body

    if (!captureId || !method || !path) {
      return NextResponse.json(
        { error: 'captureId, method, and path are required' },
        { status: 400 }
      )
    }

    const port = getProxyPort(captureId)
    if (port === null) {
      return NextResponse.json(
        { error: 'No active proxy for this capture' },
        { status: 404 }
      )
    }

    const startTime = Date.now()

    const result = await new Promise<{ statusCode: number; headers: Record<string, string>; body: string }>((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port,
        path,
        method: method.toUpperCase(),
        headers: headers || {},
      }, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers as Record<string, string>,
            body: Buffer.concat(chunks).toString('utf-8'),
          })
        })
      })

      req.on('error', reject)

      if (reqBody) {
        req.write(typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody))
      }
      req.end()
    })

    const latencyMs = Date.now() - startTime

    return NextResponse.json({
      statusCode: result.statusCode,
      headers: result.headers,
      body: result.body,
      latencyMs,
    })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
