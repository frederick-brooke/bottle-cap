'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { dashboardApi } from '@/web/lib/api'
import { StatusBadge, ModeBadge } from '@/web/components/StatusBadge'
import { ResultsTable } from '@/web/components/ResultsTable'
import { DiffViewer } from '@/web/components/DiffViewer'
import { LatencyChart } from '@/web/components/LatencyChart'
import type { Replay, ReplayResult, ReplaySummary } from '@/types'

export default function ReplayDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [replay, setReplay] = useState<Replay | null>(null)
  const [summary, setSummary] = useState<ReplaySummary | null>(null)
  const [results, setResults] = useState<ReplayResult[]>([])
  const [selectedResult, setSelectedResult] = useState<ReplayResult | null>(null)
  const [originalBody, setOriginalBody] = useState<string | null>(null)
  const [replayedBody, setReplayedBody] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [replayData, resultsData] = await Promise.all([
        dashboardApi.getReplay(id),
        dashboardApi.getReplayResults(id),
      ])
      setReplay(replayData.replay)
      setSummary(replayData.summary)
      setResults(resultsData.results)
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
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [fetchData])

  async function handleCancel() {
    setCancelling(true)
    try {
      await dashboardApi.cancelReplay(id)
      await fetchData()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCancelling(false)
    }
  }

  async function handleSelectResult(result: ReplayResult) {
    setSelectedResult(result)
    setOriginalBody(null)
    setReplayedBody(null)

    try {
      const reqDetail = await dashboardApi.getRequestDetail(result.request_id).catch(() => null)
      if (reqDetail) {
        setOriginalBody(reqDetail.responseBody)
        setReplayedBody(null)
      }
    } catch {
      // Silently handle errors
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading replay...</p>
      </div>
    )
  }

  if (error || !replay) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">{error || 'Replay not found'}</p>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const canCancel = replay.status === 'pending' || replay.status === 'running'
  const isRunning = replay.status === 'running' || replay.status === 'pending'
  const progress = replay.total_requests > 0
    ? Math.round((replay.completed_requests / replay.total_requests) * 100)
    : 0
  const passRate = summary && summary.total > 0
    ? Math.round((summary.identical / summary.total) * 100)
    : null

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
                {replay.name || replay.id.slice(0, 8)}
              </h1>
              <p className="text-sm text-zinc-500 mt-1 font-mono">{replay.target_url}</p>
            </div>
            <div className="flex items-center gap-2">
              <ModeBadge mode={replay.mode} />
              <StatusBadge status={replay.status} size="md" />
              {canCancel && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-sm bg-red-900/50 hover:bg-red-800 text-red-300 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel'}
                </button>
              )}
              <Link
                href={`/replays/new?capture=${replay.capture_id}`}
                className="text-sm bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 px-3 py-1.5 rounded transition-colors"
              >
                Re-run
              </Link>
            </div>
          </div>
        </div>

        {isRunning && (
          <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </div>
              <span className="text-sm font-medium text-zinc-100">
                {replay.status === 'pending' ? 'Waiting to start...' : 'Replaying requests...'}
              </span>
              <span className="text-sm text-zinc-400 tabular-nums">
                {replay.completed_requests}/{replay.total_requests}
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span>{progress}% complete</span>
              {replay.total_requests > 0 && (
                <span>{replay.total_requests - replay.completed_requests} remaining</span>
              )}
            </div>
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Total</p>
              <p className="text-sm text-zinc-100 font-medium">{summary.total}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Identical</p>
              <p className="text-sm text-emerald-400 font-medium">{summary.identical}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Status Changed</p>
              <p className="text-sm text-amber-400 font-medium">{summary.status_changed}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Errors</p>
              <p className={`text-sm font-medium ${summary.errors > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                {summary.errors}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Pass Rate</p>
              <p className={`text-sm font-medium ${
                passRate === 100 ? 'text-emerald-400' : passRate != null && passRate >= 80 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {passRate != null ? `${passRate}%` : '---'}
              </p>
            </div>
          </div>
        )}

        {summary && summary.avg_latency_delta_ms != null && (
          <div className="mb-8">
            <LatencyChart results={results} />
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">
            Results ({results.length})
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <ResultsTable
              results={results}
              onSelect={handleSelectResult}
              selectedId={selectedResult?.id}
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">
            Diff Viewer
          </h2>
          {selectedResult ? (
            <DiffViewer
              originalBody={originalBody}
              replayedBody={replayedBody}
            />
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
              <p className="text-zinc-500 text-sm">Select a request from the results table above to view the diff</p>
            </div>
          )}
        </div>

        <div className="text-xs text-zinc-600 mt-8">
          Created: {new Date(replay.created_at).toLocaleString()}
          {replay.started_at && ` • Started: ${new Date(replay.started_at).toLocaleString()}`}
          {replay.completed_at && ` • Completed: ${new Date(replay.completed_at).toLocaleString()}`}
        </div>
      </div>
    </main>
  )
}
