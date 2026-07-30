'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { dashboardApi } from '@/web/lib/api'
import { StatusBadge } from '@/web/components/StatusBadge'
import { ReplayCard } from '@/web/components/ReplayCard'
import { EmptyState } from '@/web/components/EmptyState'
import { RequestList } from '@/web/components/RequestList'
import type { HttpRequest } from '@/types'
import type { ReplayWithSummary, CaptureWithStatus } from '@/web/lib/api'

export default function CaptureDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [capture, setCapture] = useState<CaptureWithStatus | null>(null)
  const [requests, setRequests] = useState<HttpRequest[]>([])
  const [replays, setReplays] = useState<ReplayWithSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const data = await dashboardApi.getCapture(id)
      setCapture(data.capture)
      setRequests(data.requests)
      setReplays(data.replays)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading capture...</p>
      </div>
    )
  }

  if (error || !capture) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">{error || 'Capture not found'}</p>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 mb-2 inline-block">
            ← Dashboard
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-zinc-100">
                {capture.name || capture.id.slice(0, 8)}
              </h1>
              <p className="text-sm text-zinc-500 mt-1">{capture.service_name}</p>
            </div>
            <StatusBadge status={capture.status} size="md" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500">Target</p>
            <p className="text-sm text-zinc-300 font-mono truncate">{capture.target_url}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500">Requests</p>
            <p className="text-sm text-zinc-100 font-medium">{capture.request_count}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500">Sample Rate</p>
            <p className="text-sm text-zinc-100">{(capture.sample_rate * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500">Started</p>
            <p className="text-sm text-zinc-100">
              {new Date(capture.started_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-400">
              Captured Requests ({requests.length})
            </h2>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <RequestList
              requests={requests}
              onSelect={(reqId) => router.push(`/capture?request=${reqId}`)}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-400">
              Replays ({replays.length})
            </h2>
            <Link
              href={`/replays/new?capture=${capture.id}`}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              New Replay
            </Link>
          </div>
          {replays.length === 0 ? (
            <EmptyState
              title="No replays for this capture"
              description="Create a replay to verify fixes against this captured traffic"
            />
          ) : (
            <div className="space-y-3">
              {replays.map(r => (
                <ReplayCard key={r.id} replay={r} summary={r.summary} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
