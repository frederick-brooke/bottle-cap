'use client'

import { StatusBadge } from './StatusBadge'
import type { ReplayResult } from '@/types'

interface ResultsTableProps {
  results: ReplayResult[]
  onSelect?: (result: ReplayResult) => void
  selectedId?: string
}

function statusColor(code: number | null): string {
  if (code == null) return 'text-zinc-500'
  if (code >= 200 && code < 300) return 'text-emerald-400'
  if (code >= 300 && code < 400) return 'text-blue-400'
  if (code >= 400 && code < 500) return 'text-amber-400'
  return 'text-red-400'
}

function formatLatency(ms: number | null): string {
  if (ms == null) return '---'
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function latencyDelta(original: number | null, replayed: number | null): string {
  if (original == null || replayed == null) return '---'
  const delta = replayed - original
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(0)}ms`
}

function latencyDeltaColor(original: number | null, replayed: number | null): string {
  if (original == null || replayed == null) return 'text-zinc-500'
  const delta = replayed - original
  if (delta > 50) return 'text-red-400'
  if (delta > 0) return 'text-amber-400'
  if (delta < -50) return 'text-emerald-400'
  return 'text-zinc-400'
}

export function ResultsTable({ results, onSelect, selectedId }: ResultsTableProps) {
  if (results.length === 0) {
    return (
      <p className="text-zinc-500 text-sm py-4 text-center">No results yet.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-xs border-b border-zinc-800">
            <th className="text-left py-2 px-2 font-medium">Status</th>
            <th className="text-right py-2 px-2 font-medium">Original</th>
            <th className="text-right py-2 px-2 font-medium">Replayed</th>
            <th className="text-right py-2 px-2 font-medium">Latency</th>
            <th className="text-right py-2 px-2 font-medium">Delta</th>
            <th className="text-center py-2 px-2 font-medium">Body</th>
            <th className="text-center py-2 px-2 font-medium">Truncated</th>
            <th className="text-left py-2 px-2 font-medium">Error</th>
          </tr>
        </thead>
        <tbody>
          {results.map(r => {
            const identical = r.body_identical && r.original_status === r.replayed_status
            return (
              <tr
                key={r.id}
                onClick={() => onSelect?.(r)}
                className={`cursor-pointer transition-colors border-b border-zinc-800/50 ${
                  selectedId === r.id ? 'bg-zinc-700' : 'hover:bg-zinc-800/50'
                }`}
              >
                <td className="py-1.5 px-2">
                  {identical ? (
                    <span className="text-emerald-400 text-xs">✓ Identical</span>
                  ) : r.error ? (
                    <StatusBadge status="failed" />
                  ) : (
                    <span className="text-amber-400 text-xs">Changed</span>
                  )}
                </td>
                <td className={`py-1.5 px-2 text-right font-mono ${statusColor(r.original_status)}`}>
                  {r.original_status ?? '---'}
                </td>
                <td className={`py-1.5 px-2 text-right font-mono ${statusColor(r.replayed_status)}`}>
                  {r.replayed_status ?? '---'}
                </td>
                <td className="py-1.5 px-2 text-right text-zinc-400 tabular-nums">
                  {formatLatency(r.replayed_latency_ms)}
                </td>
                <td className={`py-1.5 px-2 text-right tabular-nums ${latencyDeltaColor(r.original_latency_ms, r.replayed_latency_ms)}`}>
                  {latencyDelta(r.original_latency_ms, r.replayed_latency_ms)}
                </td>
                <td className="py-1.5 px-2 text-center">
                  {r.body_identical === null ? (
                    <span className="text-zinc-600">---</span>
                  ) : r.body_identical ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-amber-400">✗</span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-center">
                  {r.truncated ? (
                    <span className="text-amber-400 text-xs">Yes</span>
                  ) : (
                    <span className="text-zinc-600">---</span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-red-400 text-xs truncate max-w-xs">
                  {r.error || ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
