export interface Capture {
  id: string
  name: string | null
  status: 'active' | 'paused' | 'completed'
  service_name: string
  target_url: string
  sample_rate: number
  started_at: string
  stopped_at: string | null
  request_count: number
  config: Record<string, unknown> | null
}

export interface HttpRequest {
  id: string
  capture_id: string
  trace_id: string | null
  method: string
  url: string
  headers: Record<string, string> | null
  request_body_key: string | null
  request_body_preview: string | null
  status_code: number | null
  response_headers: Record<string, string> | null
  response_body_key: string | null
  response_body_preview: string | null
  latency_ms: number | null
  service_version: string | null
  recorded_at: string
  created_at: string
}

export interface Replay {
  id: string
  name: string | null
  capture_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  target_url: string
  mode: 'paced' | 'burst' | 'throttled'
  rate_limit: number | null
  config: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
  total_requests: number
  completed_requests: number
  created_at: string
  triggered_by: string | null
}

export interface ReplayResult {
  id: string
  replay_id: string
  request_id: string
  original_status: number | null
  replayed_status: number | null
  original_latency_ms: number | null
  replayed_latency_ms: number | null
  body_diff_summary: Record<string, unknown> | null
  body_identical: boolean | null
  truncated: boolean | null
  error: string | null
  replayed_at: string
}

export interface ReplaySummary {
  replay_id: string
  name: string | null
  status: string
  mode: string
  total: number
  identical: number
  status_changed: number
  errors: number
  avg_latency_delta_ms: number | null
}
