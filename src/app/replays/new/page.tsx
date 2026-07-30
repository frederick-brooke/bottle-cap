'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { dashboardApi } from '@/web/lib/api'
import { ReplayForm } from '@/web/components/ReplayForm'
import type { Capture } from '@/types'

export default function NewReplayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedCapture = searchParams.get('capture')

  const [captures, setCaptures] = useState<Capture[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await dashboardApi.listCaptures(100)
        setCaptures(data.captures)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSubmit(input: { name?: string; captureId: string; targetUrl: string; mode: string; rateLimit?: number }) {
    setSubmitting(true)
    setError(null)
    try {
      const { replay } = await dashboardApi.createReplay(input)
      router.push(`/replays/${replay.id}`)
    } catch (err) {
      setError((err as Error).message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading captures...</p>
      </div>
    )
  }

  return (
    <main className="flex-1 bg-zinc-950">
      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 mb-2 inline-block">
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-zinc-100">New Replay</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Replay captured traffic against a target to verify fixes
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-6 text-sm text-red-300">
            {error}
          </div>
        )}

        {captures.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <p className="text-zinc-500 text-sm mb-3">No captures available</p>
            <Link href="/capture" className="text-xs text-emerald-400 hover:text-emerald-300">
              Create a capture first
            </Link>
          </div>
        ) : (
          <ReplayForm
            captures={captures}
            defaultCaptureId={preselectedCapture}
            onSubmit={handleSubmit}
            loading={submitting}
          />
        )}
      </div>
    </main>
  )
}
