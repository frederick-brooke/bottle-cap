'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { dashboardApi } from '@/web/lib/api'
import { ReplayCard } from '@/web/components/ReplayCard'
import { EmptyState } from '@/web/components/EmptyState'
import type { ReplayWithSummary } from '@/web/lib/api'

export default function ReplaysPage() {
  const [replays, setReplays] = useState<ReplayWithSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchData = useCallback(async (offset = 0) => {
    try {
      const data = await dashboardApi.listReplays(50, offset)
      if (offset === 0) {
        setReplays(data.replays)
      } else {
        setReplays(prev => [...prev, ...data.replays])
      }
      setHasMore(data.replays.length === 50)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
    const interval = setInterval(() => fetchData(0), 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  function loadMore() {
    fetchData(replays.length)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading replays...</p>
      </div>
    )
  }

  return (
    <main className="flex-1 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 mb-2 inline-block">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold text-zinc-100">Replays</h1>
          </div>
          <Link
            href="/replays/new"
            className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded transition-colors"
          >
            New Replay
          </Link>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-6 text-sm text-red-300">
            {error}
          </div>
        )}

        {replays.length === 0 ? (
          <EmptyState
            title="No replays yet"
            description="Create a replay to compare original vs fixed responses"
            action={
              <Link href="/replays/new" className="text-xs text-emerald-400 hover:text-emerald-300">
                Create Replay
              </Link>
            }
          />
        ) : (
          <>
            <div className="space-y-3">
              {replays.map(r => (
                <ReplayCard key={r.id} replay={r} summary={r.summary} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMore}
                  className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
