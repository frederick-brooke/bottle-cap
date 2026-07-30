import type { HttpRequest } from '@/types'

export interface ReplayOptions {
  replayId: string
  captureId: string
  targetUrl: string
  mode: 'paced' | 'burst' | 'throttled'
  rateLimit?: number
  timeout: number
  maxConcurrent: number
}

export interface SendResult {
  requestId: string
  statusCode: number | null
  headers: Record<string, string> | null
  body: string | null
  latencyMs: number
  error: string | null
}

export interface ReplayMode {
  name: string
  execute(
    requests: HttpRequest[],
    send: (req: HttpRequest) => Promise<SendResult>,
    options: ReplayOptions,
    onResult: (result: SendResult) => void,
    shouldStop: () => boolean,
  ): Promise<void>
}
