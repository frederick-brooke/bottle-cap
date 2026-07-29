export interface CaptureSession {
  captureId: string
  targetUrl: string
  sampleRate: number
  listenPort: number
  maxBodySize: number
}

export interface CapturedBody {
  buffer: Buffer
  preview: string
  s3Key: string | null
}

export interface SanitizerConfig {
  stripHeaders: string[]
}

export interface SamplerConfig {
  rate: number
  includePatterns?: RegExp[]
  excludePatterns?: RegExp[]
}

export const DEFAULT_STRIP_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'x-api-key',
]

export const BODY_PREVIEW_LENGTH = 500
export const INLINE_BODY_THRESHOLD = 1024
