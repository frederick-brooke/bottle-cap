'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { dashboardApi, type DashboardStats } from '@/web/lib/api'
import { DashboardStats as DashboardStatsComponent } from '@/web/components/DashboardStats'
import { CaptureCard } from '@/web/components/CaptureCard'
import { ReplayCard } from '@/web/components/ReplayCard'
import { EmptyState } from '@/web/components/EmptyState'

interface RecentCapture {
  id: string
  name: string | null
  status: string
  service_name: string
  request_count: number
  started_at: string
}

interface RecentReplay {
  id: string
  name: string | null
  status: string
  mode: string
  capture_id: string
  created_at: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentCaptures, setRecentCaptures] = useState<RecentCapture[]>([])
  const [recentReplays, setRecentReplays] = useState<RecentReplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const data = await dashboardApi.getStats()
      setStats(data.stats)
      setRecentCaptures(data.recentCaptures)
      setRecentReplays(data.recentReplays)
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
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <main className="flex-1 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
          <div className="flex gap-3">
            <Link
              href="/capture"
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors"
            >
              New Capture
            </Link>
            <Link
              href="/replays/new"
              className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded transition-colors"
            >
              New Replay
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-6 text-sm text-red-300">
            {error}
          </div>
        )}

        {stats && <DashboardStatsComponent stats={stats} />}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-zinc-400">Recent Captures</h2>
              <Link href="/capture" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                View all
              </Link>
            </div>
            {recentCaptures.length === 0 ? (
              <EmptyState
                title="No captures yet"
                description="Start a capture from the Capture console"
                action={
                  <Link href="/capture" className="text-xs text-emerald-400 hover:text-emerald-300">
                    Go to Capture Console
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {recentCaptures.map(c => (
                  <CaptureCard key={c.id} capture={c} />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-zinc-400">Recent Replays</h2>
              <Link href="/replays" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                View all
              </Link>
            </div>
            {recentReplays.length === 0 ? (
              <EmptyState
                title="No replays yet"
                description="Create a replay to compare responses"
                action={
                  <Link href="/replays/new" className="text-xs text-emerald-400 hover:text-emerald-300">
                    Create Replay
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {recentReplays.map(r => (
                  <ReplayCard key={r.id} replay={r} summary={null} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
