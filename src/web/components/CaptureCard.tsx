'use client'

import Link from 'next/link'
import { StatusBadge } from './StatusBadge'

interface CaptureCardProps {
  capture: {
    id: string
    name: string | null
    status: string
    service_name: string
    request_count: number
    started_at: string
    target_url?: string
    sample_rate?: number
    isActive?: boolean
    proxyPort?: number | null
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function CaptureCard({ capture }: CaptureCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
      <Link href={`/captures/${capture.id}`} className="block">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-zinc-100 truncate">
              {capture.name || capture.id.slice(0, 8)}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">{capture.service_name}</p>
          </div>
          <StatusBadge status={capture.status} />
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>{capture.request_count} requests</span>
          {capture.target_url && (
            <span className="font-mono truncate">{capture.target_url}</span>
          )}
        </div>
        <div className="text-xs text-zinc-600 mt-2">
          {formatTime(capture.started_at)}
        </div>
      </Link>
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <Link
          href={`/replays/new?capture=${capture.id}`}
          onClick={e => e.stopPropagation()}
          className="text-xs bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 px-3 py-1.5 rounded transition-colors"
        >
          Replay
        </Link>
      </div>
    </div>
  )
}
