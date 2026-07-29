'use client'

import type { HttpRequest } from '@/types'

interface RequestDetailProps {
  request: HttpRequest
  requestBody: string | null
  responseBody: string | null
}

function HeadersTable({ headers }: { headers: Record<string, string> | null }) {
  if (!headers || Object.keys(headers).length === 0) {
    return <p className="text-zinc-500 text-xs">No headers</p>
  }
  return (
    <div className="space-y-0.5">
      {Object.entries(headers).map(([k, v]) => (
        <div key={k} className="flex gap-2 text-xs font-mono">
          <span className="text-zinc-400 shrink-0">{k}:</span>
          <span className="text-zinc-200 break-all">{v}</span>
        </div>
      ))}
    </div>
  )
}

function BodyBlock({ label, body }: { label: string; body: string | null }) {
  if (!body) {
    return (
      <div>
        <h4 className="text-xs font-medium text-zinc-400 mb-1">{label}</h4>
        <p className="text-zinc-600 text-xs italic">Empty</p>
      </div>
    )
  }

  let formatted = body
  try {
    formatted = JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    // keep raw
  }

  return (
    <div>
      <h4 className="text-xs font-medium text-zinc-400 mb-1">{label}</h4>
      <pre className="bg-zinc-900 border border-zinc-800 rounded p-3 text-xs text-zinc-200 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap break-all">
        {formatted}
      </pre>
    </div>
  )
}

function statusLabel(code: number | null): string {
  if (!code) return '---'
  const labels: Record<number, string> = {
    200: '200 OK', 201: '201 Created', 204: '204 No Content',
    301: '301 Moved', 302: '302 Found', 304: '304 Not Modified',
    400: '400 Bad Request', 401: '401 Unauthorized', 403: '403 Forbidden',
    404: '404 Not Found', 500: '500 Server Error', 502: '502 Bad Gateway',
    503: '503 Unavailable',
  }
  return labels[code] || String(code)
}

export function RequestDetail({ request, requestBody, responseBody }: RequestDetailProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-mono font-bold text-zinc-100">{request.method}</span>
        <span className="font-mono text-zinc-300">{request.url}</span>
        <span className="text-zinc-500">→</span>
        <span className="font-mono font-medium text-zinc-100">{statusLabel(request.status_code)}</span>
        {request.latency_ms != null && (
          <span className="text-zinc-400 tabular-nums">{request.latency_ms.toFixed(0)}ms</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-medium text-zinc-400 mb-2">Request Headers</h4>
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
            <HeadersTable headers={request.headers} />
          </div>
        </div>
        <div>
          <h4 className="text-xs font-medium text-zinc-400 mb-2">Response Headers</h4>
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
            <HeadersTable headers={request.response_headers} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BodyBlock label="Request Body" body={requestBody} />
        <BodyBlock label="Response Body" body={responseBody} />
      </div>

      <div className="flex gap-4 text-xs text-zinc-500">
        <span>ID: {request.id}</span>
        <span>Recorded: {request.recorded_at}</span>
        {request.service_version && <span>Version: {request.service_version}</span>}
      </div>
    </div>
  )
}
