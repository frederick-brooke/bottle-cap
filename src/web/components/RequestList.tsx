'use client'

import type { HttpRequest } from '@/types'
import type { CaptureWithStatus } from '@/web/lib/api'

interface RequestListProps {
  requests: HttpRequest[]
  capture?: CaptureWithStatus
  onSelect: (id: string) => void
  selectedId?: string
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-900 text-emerald-300',
  POST: 'bg-blue-900 text-blue-300',
  PUT: 'bg-amber-900 text-amber-300',
  PATCH: 'bg-amber-900 text-amber-300',
  DELETE: 'bg-red-900 text-red-300',
}

function statusColor(code: number | null): string {
  if (!code) return 'text-zinc-500'
  if (code >= 200 && code < 300) return 'text-emerald-400'
  if (code >= 300 && code < 400) return 'text-blue-400'
  if (code >= 400 && code < 500) return 'text-amber-400'
  return 'text-red-400'
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString()
  } catch {
    return iso
  }
}

export function RequestList({ requests, capture, onSelect, selectedId }: RequestListProps) {
  if (requests.length === 0) {
    return (
      <p className="text-zinc-500 text-sm py-4 text-center">No requests captured yet.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      {capture && (
        <div className="flex items-center gap-4 text-xs text-zinc-500 mb-2 px-2">
          <span>Service: <span className="text-zinc-300">{capture.service_name}</span></span>
          <span>Target: <span className="text-zinc-300 font-mono">{capture.target_url}</span></span>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-xs border-b border-zinc-800">
            <th className="text-left py-2 px-2 font-medium">Method</th>
            <th className="text-left py-2 px-2 font-medium">URL</th>
            <th className="text-right py-2 px-2 font-medium">Status</th>
            <th className="text-right py-2 px-2 font-medium">Latency</th>
            <th className="text-right py-2 px-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(r => (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`cursor-pointer transition-colors border-b border-zinc-800/50 ${
                selectedId === r.id ? 'bg-zinc-700' : 'hover:bg-zinc-800/50'
              }`}
            >
              <td className="py-1.5 px-2">
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${METHOD_COLORS[r.method] || 'bg-zinc-800 text-zinc-300'}`}>
                  {r.method}
                </span>
              </td>
              <td className="py-1.5 px-2 font-mono text-zinc-300 truncate max-w-xs">{r.url}</td>
              <td className={`py-1.5 px-2 text-right font-mono ${statusColor(r.status_code)}`}>
                {r.status_code || '---'}
              </td>
              <td className="py-1.5 px-2 text-right text-zinc-400 tabular-nums">
                {r.latency_ms != null ? `${r.latency_ms.toFixed(0)}ms` : '---'}
              </td>
              <td className="py-1.5 px-2 text-right text-zinc-500 tabular-nums text-xs">
                {formatTime(r.recorded_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
