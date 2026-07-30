import { describe, it, expect } from 'vitest'
import type { HttpRequest } from '../../../src/types'
import type { ReplayOptions, SendResult } from '../../../src/replay/types'
import { pacedMode } from '../../../src/replay/modes/pace'

function makeRequest(id: string, recordedAt: string): HttpRequest {
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
    recorded_at: recordedAt,
    created_at: recordedAt,
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
    mode: 'paced',
    timeout: 5000,
    maxConcurrent: 10,
    ...overrides,
  }
}

describe('pacedMode', () => {
  it('sends all requests', async () => {
    const requests = [
      makeRequest('1', '2024-01-01T00:00:00Z'),
      makeRequest('2', '2024-01-01T00:00:01Z'),
      makeRequest('3', '2024-01-01T00:00:02Z'),
    ]
    const results: SendResult[] = []

    await pacedMode.execute(requests, makeSend(), makeOptions(), (r) => results.push(r), () => false)

    expect(results).toHaveLength(3)
    expect(results.map((r) => r.requestId)).toEqual(['1', '2', '3'])
  })

  it('handles empty request list', async () => {
    const results: SendResult[] = []
    await pacedMode.execute([], makeSend(), makeOptions(), (r) => results.push(r), () => false)
    expect(results).toHaveLength(0)
  })

  it('sorts requests by recorded_at', async () => {
    const requests = [
      makeRequest('3', '2024-01-01T00:00:03Z'),
      makeRequest('1', '2024-01-01T00:00:01Z'),
      makeRequest('2', '2024-01-01T00:00:02Z'),
    ]
    const results: SendResult[] = []

    await pacedMode.execute(requests, makeSend(), makeOptions(), (r) => results.push(r), () => false)

    expect(results.map((r) => r.requestId)).toEqual(['1', '2', '3'])
  })

  it('stops when shouldStop returns true', async () => {
    const requests = [
      makeRequest('1', '2024-01-01T00:00:00Z'),
      makeRequest('2', '2024-01-01T00:00:30Z'),
      makeRequest('3', '2024-01-01T00:01:00Z'),
    ]
    const results: SendResult[] = []
    let callCount = 0

    await pacedMode.execute(
      requests,
      makeSend(),
      makeOptions(),
      (r) => {
        results.push(r)
        callCount++
      },
      () => callCount >= 2,
    )

    expect(results).toHaveLength(2)
  }, 45000)

  it('caps delay at 30 seconds', async () => {
    const requests = [
      makeRequest('1', '2024-01-01T00:00:00Z'),
      makeRequest('2', '2024-01-01T01:00:00Z'),
    ]
    const results: SendResult[] = []
    const start = Date.now()

    await pacedMode.execute(requests, makeSend(), makeOptions(), (r) => results.push(r), () => false)

    const elapsed = Date.now() - start
    expect(results).toHaveLength(2)
    expect(elapsed).toBeLessThan(35000)
  }, 45000)
})
