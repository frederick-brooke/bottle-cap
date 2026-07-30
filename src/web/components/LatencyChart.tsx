'use client'

import type { ReplayResult } from '@/types'

interface LatencyChartProps {
  results: ReplayResult[]
}

interface BarData {
  label: string
  original: number
  replayed: number
}

export function LatencyChart({ results }: LatencyChartProps) {
  const validResults = results.filter(
    r => r.original_latency_ms != null && r.replayed_latency_ms != null
  )

  if (validResults.length === 0) {
    return (
      <p className="text-zinc-500 text-sm py-4 text-center">
        No latency data available for chart.
      </p>
    )
  }

  const bars: BarData[] = validResults.slice(0, 50).map((r, i) => ({
    label: `#${i + 1}`,
    original: r.original_latency_ms!,
    replayed: r.replayed_latency_ms!,
  }))

  const maxLatency = Math.max(...bars.flatMap(b => [b.original, b.replayed]))
  const chartHeight = 200

  const avgOriginal = validResults.reduce((sum, r) => sum + r.original_latency_ms!, 0) / validResults.length
  const avgReplayed = validResults.reduce((sum, r) => sum + r.replayed_latency_ms!, 0) / validResults.length
  const avgDelta = avgReplayed - avgOriginal

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-zinc-100">Latency Comparison</h4>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-zinc-600 rounded" />
            Original
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-500 rounded" />
            Replayed
          </span>
        </div>
      </div>

      <div className="flex items-end gap-px" style={{ height: chartHeight }}>
        {bars.map((bar, i) => {
          const origHeight = (bar.original / maxLatency) * (chartHeight - 20)
          const replHeight = (bar.replayed / maxLatency) * (chartHeight - 20)
          return (
            <div key={i} className="flex-1 flex items-end gap-px group relative" style={{ minWidth: 4 }}>
              <div
                className="flex-1 bg-zinc-600 rounded-t opacity-70 group-hover:opacity-100 transition-opacity"
                style={{ height: origHeight }}
              />
              <div
                className="flex-1 bg-blue-500 rounded-t opacity-70 group-hover:opacity-100 transition-opacity"
                style={{ height: replHeight }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block">
                <div className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                  <div className="text-zinc-400">Orig: {bar.original.toFixed(0)}ms</div>
                  <div className="text-blue-300">Repl: {bar.replayed.toFixed(0)}ms</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-zinc-500">
        <span>
          Avg: <span className="text-zinc-400">{avgOriginal.toFixed(0)}ms</span> →{' '}
          <span className="text-blue-400">{avgReplayed.toFixed(0)}ms</span>
        </span>
        <span className={avgDelta > 0 ? 'text-amber-400' : 'text-emerald-400'}>
          {avgDelta > 0 ? '+' : ''}{avgDelta.toFixed(0)}ms avg delta
        </span>
      </div>
    </div>
  )
}
