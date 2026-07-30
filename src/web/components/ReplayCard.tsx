'use client'

import Link from 'next/link'
import { StatusBadge, ModeBadge } from './StatusBadge'
import type { ReplaySummary } from '@/types'

interface ReplayCardProps {
  replay: {
    id: string
    name: string | null
    status: string
    mode: string
    created_at: string
    capture_id: string
    target_url?: string
    completed_at?: string | null
  }
  summary?: ReplaySummary | null
}

function formatTime(iso: string | null): string {
  if (!iso) return '---'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function ReplayCard({ replay, summary }: ReplayCardProps) {
  const passRate = summary && summary.total > 0
    ? Math.round((summary.identical / summary.total) * 100)
    : null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
      <Link href={`/replays/${replay.id}`} className="block">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-zinc-100 truncate">
              {replay.name || replay.id.slice(0, 8)}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono truncate">{replay.target_url}</p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <ModeBadge mode={replay.mode} />
            <StatusBadge status={replay.status} />
          </div>
        </div>

        {summary && (
          <div className="flex items-center gap-4 text-xs mt-2">
            <span className="text-zinc-400">
              <span className="text-zinc-100 font-medium">{summary.identical}</span>
              <span className="text-zinc-600"> / {summary.total} identical</span>
            </span>
            {passRate !== null && (
              <span className={`font-medium ${
                passRate === 100 ? 'text-emerald-400' : passRate >= 80 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {passRate}% pass
              </span>
            )}
            {summary.errors > 0 && (
              <span className="text-red-400">{summary.errors} errors</span>
            )}
            {summary.avg_latency_delta_ms != null && (
              <span className={`${
                summary.avg_latency_delta_ms > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {summary.avg_latency_delta_ms > 0 ? '+' : ''}{summary.avg_latency_delta_ms.toFixed(0)}ms avg
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-zinc-600 mt-2">
          <span>{formatTime(replay.created_at)}</span>
          {replay.completed_at && (
            <span>completed {formatTime(replay.completed_at)}</span>
          )}
          {(replay.status === 'running' || replay.status === 'pending') && (
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              {replay.status === 'pending' ? 'queued' : 'running'}
            </span>
          )}
        </div>
      </Link>
      <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-2">
        <Link
          href={`/replays/new?capture=${replay.capture_id}`}
          onClick={e => e.stopPropagation()}
          className="text-xs bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 px-3 py-1.5 rounded transition-colors"
        >
          Re-run
        </Link>
      </div>
    </div>
  )
}
