import { describe, it, expect } from 'vitest'
import type { HttpRequest } from '../../../src/types'
import type { ReplayOptions, SendResult } from '../../../src/replay/types'
import { throttledMode } from '../../../src/replay/modes/throttle'

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
    mode: 'throttled',
    timeout: 5000,
    maxConcurrent: 10,
    rateLimit: 100,
    ...overrides,
  }
}

describe('throttledMode', () => {
  it('sends all requests', async () => {
    const requests = [makeRequest('1'), makeRequest('2'), makeRequest('3')]
    const results: SendResult[] = []

    await throttledMode.execute(requests, makeSend(), makeOptions(), (r) => results.push(r), () => false)

    expect(results).toHaveLength(3)
    expect(results.map((r) => r.requestId).sort()).toEqual(['1', '2', '3'])
  })

  it('handles empty request list', async () => {
    const results: SendResult[] = []
    await throttledMode.execute([], makeSend(), makeOptions(), (r) => results.push(r), () => false)
    expect(results).toHaveLength(0)
  })

  it('respects rate limit', async () => {
    const timestamps: number[] = []
    const send = async (req: HttpRequest): Promise<SendResult> => {
      timestamps.push(Date.now())
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

    await throttledMode.execute(requests, send, makeOptions({ rateLimit: 10, maxConcurrent: 1 }), (r) => results.push(r), () => false)

    expect(results).toHaveLength(3)
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(90)
    expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(90)
  })

  it('stops when shouldStop returns true', async () => {
    const requests = [makeRequest('1'), makeRequest('2'), makeRequest('3')]
    const results: SendResult[] = []

    await throttledMode.execute(
      requests,
      makeSend(),
      makeOptions({ rateLimit: 1000, maxConcurrent: 1 }),
      (r) => results.push(r),
      () => results.length >= 2,
    )

    expect(results.length).toBeLessThanOrEqual(3)
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('handles onResult errors gracefully without losing requests', async () => {
    const requests = [makeRequest('1'), makeRequest('2'), makeRequest('3')]
    const results: SendResult[] = []
    let onResultCallCount = 0

    await throttledMode.execute(
      requests,
      makeSend(),
      makeOptions({ rateLimit: 1000, maxConcurrent: 1 }),
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
