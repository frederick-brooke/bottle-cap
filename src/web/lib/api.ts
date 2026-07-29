import type { Capture, HttpRequest } from '@/types'

export interface CaptureWithStatus extends Capture {
  isActive: boolean
  proxyPort: number | null
}

export interface StartCaptureInput {
  name?: string
  serviceName: string
  targetUrl: string
  sampleRate?: number
  port?: number
}

export interface TestRequestInput {
  captureId: string
  method: string
  path: string
  headers?: Record<string, string>
  body?: string
}

export interface TestResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
  latencyMs: number
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data as T
}

export const debugApi = {
  listCaptures(limit?: number): Promise<{ captures: CaptureWithStatus[] }> {
    const qs = limit ? `?limit=${limit}` : ''
    return apiFetch(`/api/debug/captures${qs}`)
  },

  startCapture(input: StartCaptureInput): Promise<{ capture: Capture; listenPort: number }> {
    return apiFetch('/api/debug/captures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  },

  stopCapture(id: string): Promise<{ capture: Capture }> {
    return apiFetch(`/api/debug/captures/${id}/stop`, { method: 'POST' })
  },

  getCaptureRequests(id: string): Promise<{ capture: Capture; requests: HttpRequest[] }> {
    return apiFetch(`/api/debug/captures/${id}`)
  },

  getRequestDetail(id: string): Promise<{ request: HttpRequest; requestBody: string | null; responseBody: string | null }> {
    return apiFetch(`/api/debug/requests/${id}`)
  },

  sendTestRequest(input: TestRequestInput): Promise<TestResponse> {
    return apiFetch('/api/debug/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  },
}
