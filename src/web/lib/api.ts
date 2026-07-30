import type { Capture, HttpRequest, Replay, ReplayResult, ReplaySummary } from '@/types'

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

export interface DashboardStats {
  totalCaptures: number
  activeCaptures: number
  totalReplays: number
  completedReplays: number
  failedReplays: number
  successRate: number
}

export interface ReplayWithSummary extends Replay {
  summary: ReplaySummary | null
}

export interface CreateReplayInput {
  name?: string
  captureId: string
  targetUrl: string
  mode?: string
  rateLimit?: number
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data as T
}

export const captureApi = {
  listCaptures(limit?: number): Promise<{ captures: CaptureWithStatus[] }> {
    const qs = limit ? `?limit=${limit}` : ''
    return apiFetch(`/api/capture/captures${qs}`)
  },

  startCapture(input: StartCaptureInput): Promise<{ capture: Capture; listenPort: number }> {
    return apiFetch('/api/capture/captures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  },

  stopCapture(id: string): Promise<{ capture: Capture }> {
    return apiFetch(`/api/capture/captures/${id}/stop`, { method: 'POST' })
  },

  getCaptureRequests(id: string): Promise<{ capture: Capture; requests: HttpRequest[] }> {
    return apiFetch(`/api/capture/captures/${id}`)
  },

  getRequestDetail(id: string): Promise<{ request: HttpRequest; requestBody: string | null; responseBody: string | null }> {
    return apiFetch(`/api/capture/requests/${id}`)
  },

  sendTestRequest(input: TestRequestInput): Promise<TestResponse> {
    return apiFetch('/api/capture/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  },
}

export const dashboardApi = {
  getStats(): Promise<{ stats: DashboardStats; recentCaptures: Array<{ id: string; name: string | null; status: string; service_name: string; request_count: number; started_at: string }>; recentReplays: Array<{ id: string; name: string | null; status: string; mode: string; created_at: string }> }> {
    return apiFetch('/api/dashboard/stats')
  },

  listCaptures(limit?: number, offset?: number): Promise<{ captures: CaptureWithStatus[] }> {
    const params = new URLSearchParams()
    if (limit != null) params.set('limit', String(limit))
    if (offset != null) params.set('offset', String(offset))
    const qs = params.toString()
    return apiFetch(`/api/dashboard/captures${qs ? `?${qs}` : ''}`)
  },

  getCapture(id: string): Promise<{ capture: CaptureWithStatus; requests: HttpRequest[]; replays: ReplayWithSummary[] }> {
    return apiFetch(`/api/dashboard/captures/${id}`)
  },

  listReplays(limit?: number, offset?: number): Promise<{ replays: ReplayWithSummary[] }> {
    const params = new URLSearchParams()
    if (limit != null) params.set('limit', String(limit))
    if (offset != null) params.set('offset', String(offset))
    const qs = params.toString()
    return apiFetch(`/api/dashboard/replays${qs ? `?${qs}` : ''}`)
  },

  getReplay(id: string): Promise<{ replay: Replay; summary: ReplaySummary | null }> {
    return apiFetch(`/api/dashboard/replays/${id}`)
  },

  getReplayResults(id: string): Promise<{ results: ReplayResult[]; summary: ReplaySummary | null }> {
    return apiFetch(`/api/dashboard/replays/${id}/results`)
  },

  createReplay(input: CreateReplayInput): Promise<{ replay: Replay }> {
    return apiFetch('/api/dashboard/replays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  },

  cancelReplay(id: string): Promise<{ replay: Replay }> {
    return apiFetch(`/api/dashboard/replays/${id}/cancel`, { method: 'POST' })
  },

  getCaptureStats(captureId: string): Promise<{ capture: Capture; requestCount: number; replays: ReplayWithSummary[] }> {
    return apiFetch(`/api/dashboard/stats/${captureId}`)
  },

  getRequestDetail(id: string): Promise<{ request: HttpRequest; requestBody: string | null; responseBody: string | null }> {
    return apiFetch(`/api/dashboard/requests/${id}`)
  },
}
