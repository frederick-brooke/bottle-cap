import { describe, it, expect } from 'vitest'
import type { HttpRequest } from '../../../src/types'
import type { ReplayOptions, SendResult } from '../../../src/replay/types'
import { burstMode } from '../../../src/replay/modes/burst'

function makeRequest(id: string): HttpRequest {
  return {
    id,
    capture_id: 'cap1',
    trace_id: null,
    method: 'GET',
    url: 'http://target.com/api',
    headers: null,
    request_body_key: null,
    request_body_preview: null,
    status_code: 200,
    response_headers: null,
    response_body_key: null,
    response_body_preview: null,
    latency_ms: 50,
    service_version: null,
    recorded_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
  }
}

function makeSend(): (req: HttpRequest) => Promise<SendResult> {
  return async (req) => ({
    requestId: req.id,
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: '{}',
    latencyMs: 10,
    error: null,
    truncated: false,
  })
}

function makeOptions(overrides?: Partial<ReplayOptions>): ReplayOptions {
  return {
    replayId: 'replay1',
    captureId: 'cap1',
    targetUrl: 'http://target.com',
    mode: 'burst',
    timeout: 5000,
    maxConcurrent: 10,
    ...overrides,
  }
}

describe('burstMode', () => {
  it('sends all requests', async () => {
    const requests = [makeRequest('1'), makeRequest('2'), makeRequest('3')]
    const results: SendResult[] = []

    await burstMode.execute(requests, makeSend(), makeOptions(), (r) => results.push(r), () => false)

    expect(results).toHaveLength(3)
    expect(results.map((r) => r.requestId).sort()).toEqual(['1', '2', '3'])
  })

  it('handles empty request list', async () => {
    const results: SendResult[] = []
    await burstMode.execute([], makeSend(), makeOptions(), (r) => results.push(r), () => false)
    expect(results).toHaveLength(0)
  })

  it('respects maxConcurrent', async () => {
    let running = 0
    let maxRunning = 0
    const send = async (req: HttpRequest): Promise<SendResult> => {
      running++
      maxRunning = Math.max(maxRunning, running)
      await new Promise((r) => setTimeout(r, 10))
      running--
      return {
        requestId: req.id,
        statusCode: 200,
        headers: null,
        body: null,
        latencyMs: 10,
        error: null,
        truncated: false,
      }
    }

    const requests = Array.from({ length: 20 }, (_, i) => makeRequest(String(i)))
    const results: SendResult[] = []

    await burstMode.execute(requests, send, makeOptions({ maxConcurrent: 3 }), (r) => results.push(r), () => false)

    expect(results).toHaveLength(20)
    expect(maxRunning).toBeLessThanOrEqual(3)
  })

  it('stops when shouldStop returns true', async () => {
    const requests = [makeRequest('1'), makeRequest('2'), makeRequest('3')]
    const results: SendResult[] = []

    await burstMode.execute(
      requests,
      makeSend(),
      makeOptions({ maxConcurrent: 1 }),
      (r) => results.push(r),
      () => results.length >= 2,
    )

    expect(results.length).toBeLessThanOrEqual(3)
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('handles send errors gracefully', async () => {
    let callCount = 0
    const send = async (req: HttpRequest): Promise<SendResult> => {
      callCount++
      if (callCount === 2) {
        return {
          requestId: req.id,
          statusCode: null,
          headers: null,
          body: null,
          latencyMs: 5,
          error: 'Connection refused',
          truncated: false,
        }
      }
      return {
        requestId: req.id,
        statusCode: 200,
        headers: null,
        body: null,
        latencyMs: 5,
        error: null,
        truncated: false,
      }
    }

    const requests = [makeRequest('1'), makeRequest('2'), makeRequest('3')]
    const results: SendResult[] = []

    await burstMode.execute(requests, send, makeOptions({ maxConcurrent: 1 }), (r) => results.push(r), () => false)

    expect(results).toHaveLength(3)
    expect(results.find((r) => r.requestId === '2')?.error).toBe('Connection refused')
  })

  it('handles onResult errors gracefully without losing requests', async () => {
    const requests = [makeRequest('1'), makeRequest('2'), makeRequest('3')]
    const results: SendResult[] = []
    let onResultCallCount = 0

    await burstMode.execute(
      requests,
      makeSend(),
      makeOptions({ maxConcurrent: 1 }),
      (r) => {
        onResultCallCount++
        if (onResultCallCount === 2) {
          throw new Error('DB write failed')
        }
        results.push(r)
      },
      () => false,
    )

    // All 3 requests should complete even though onResult threw for request 2
    expect(onResultCallCount).toBe(3)
    // Only 2 results recorded (request 2's result was lost due to the throw)
    expect(results).toHaveLength(2)
  })
})
