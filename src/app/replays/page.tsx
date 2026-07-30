'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { dashboardApi } from '@/web/lib/api'
import { ReplayCard } from '@/web/components/ReplayCard'
import { ReplayForm } from '@/web/components/ReplayForm'
import { EmptyState } from '@/web/components/EmptyState'
import type { ReplayWithSummary } from '@/web/lib/api'
import type { Capture } from '@/types'

export default function ReplaysPage() {
  const [replays, setReplays] = useState<ReplayWithSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const [captures, setCaptures] = useState<Capture[]>([])
  const [capturesLoading, setCapturesLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)

  const fetchReplays = useCallback(async (offset = 0) => {
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

  const fetchCaptures = useCallback(async () => {
    try {
      const data = await dashboardApi.listCaptures(100)
      setCaptures(data.captures)
    } catch {
      // silent
    } finally {
      setCapturesLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReplays()
    fetchCaptures()
    const interval = setInterval(() => fetchReplays(0), 5000)
    return () => clearInterval(interval)
  }, [fetchReplays, fetchCaptures])

  const handleCreateReplay = async (input: { name?: string; captureId: string; targetUrl: string; mode: string; rateLimit?: number }) => {
    setCreateLoading(true)
    try {
      await dashboardApi.createReplay(input)
      await fetchReplays(0)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreateLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading replays...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 w-[90%] mx-auto space-y-6">
      <div>
        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 mb-2 inline-block">
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold text-zinc-100">Replays</h1>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded px-4 py-2 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-300">dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          {capturesLoading ? (
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 text-sm py-4 text-center">Loading captures...</p>
            </section>
          ) : (
            <ReplayForm
              captures={captures}
              onSubmit={handleCreateReplay}
              loading={createLoading}
            />
          )}
        </div>

        <div className="lg:col-span-2 space-y-3">
          {replays.length === 0 ? (
            <EmptyState
              title="No replays yet"
              description="Create a replay to compare original vs fixed responses"
            />
          ) : (
            <>
              {replays.map(r => (
                <ReplayCard key={r.id} replay={r} summary={r.summary} />
              ))}
              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => fetchReplays(replays.length)}
                    className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
