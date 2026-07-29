'use client'

import type { CaptureWithStatus } from '@/web/lib/api'

interface CaptureListProps {
  captures: CaptureWithStatus[]
  onStop: (id: string) => void
  onSelect: (id: string) => void
  selectedId?: string
}

export function CaptureList({ captures, onStop, onSelect, selectedId }: CaptureListProps) {
  if (captures.length === 0) {
    return (
      <p className="text-zinc-500 text-sm py-4 text-center">No captures yet. Start one above.</p>
    )
  }

  return (
    <div className="space-y-1">
      {captures.map(c => (
        <div
          key={c.id}
          className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors ${
            selectedId === c.id ? 'bg-zinc-700' : 'hover:bg-zinc-800'
          }`}
          onClick={() => onSelect(c.id)}
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            c.isActive ? 'bg-emerald-400' : 'bg-zinc-600'
          }`} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-zinc-100 truncate block">
              {c.name || c.id.slice(0, 8)}
            </span>
            <span className="text-xs text-zinc-500">
              {c.service_name} {c.proxyPort ? `:${c.proxyPort}` : ''}
            </span>
          </div>
          <span className="text-xs text-zinc-400 tabular-nums">
            {c.request_count} reqs
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            c.isActive ? 'bg-emerald-900 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
          }`}>
            {c.status}
          </span>
          {c.isActive && (
            <button
              onClick={e => { e.stopPropagation(); onStop(c.id) }}
              className="text-xs px-2 py-1 bg-red-900/50 hover:bg-red-800 text-red-300 rounded transition-colors"
            >
              Stop
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
