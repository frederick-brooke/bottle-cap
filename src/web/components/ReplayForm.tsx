'use client'

import { useState } from 'react'
import type { Capture } from '@/types'

interface ReplayFormProps {
  captures: Capture[]
  defaultCaptureId?: string | null
  onSubmit: (input: { name?: string; captureId: string; targetUrl: string; mode: string; rateLimit?: number }) => Promise<void>
  loading?: boolean
}

export function ReplayForm({ captures, defaultCaptureId, onSubmit, loading }: ReplayFormProps) {
  const [name, setName] = useState('')
  const [captureId, setCaptureId] = useState(defaultCaptureId || '')
  const [targetUrl, setTargetUrl] = useState('')
  const [mode, setMode] = useState('paced')
  const [rateLimit, setRateLimit] = useState('')

  const activeCaptures = captures.filter(c => c.status === 'active' || c.status === 'completed')
  const selectedCapture = captures.find(c => c.id === captureId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!captureId || !targetUrl) return

    await onSubmit({
      name: name || undefined,
      captureId,
      targetUrl,
      mode,
      rateLimit: mode === 'throttled' ? parseInt(rateLimit, 10) : undefined,
    })

    setName('')
    setCaptureId('')
    setTargetUrl('')
    setMode('paced')
    setRateLimit('')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-medium text-zinc-100">Create Replay</h3>

      <div>
        <label className="block text-xs text-zinc-500 mb-1">Name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., post-fix-verification"
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-1">Capture *</label>
        <select
          value={captureId}
          onChange={e => setCaptureId(e.target.value)}
          required
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
        >
          <option value="">Select a capture...</option>
          {activeCaptures.map(c => (
            <option key={c.id} value={c.id}>
              {c.name || c.id.slice(0, 8)} ({c.service_name}) - {c.request_count} reqs
            </option>
          ))}
        </select>
      </div>

      {selectedCapture && (
        <div className="text-xs text-zinc-500 -mt-2">
          Target: <span className="text-zinc-400 font-mono">{selectedCapture.target_url}</span>
        </div>
      )}

      <div>
        <label className="block text-xs text-zinc-500 mb-1">Replay Target URL *</label>
        <input
          type="url"
          value={targetUrl}
          onChange={e => setTargetUrl(e.target.value)}
          placeholder="https://api.staging.example.com"
          required
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-1">Mode</label>
        <div className="flex gap-2">
          {['paced', 'burst', 'throttled'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                mode === m
                  ? m === 'paced' ? 'bg-cyan-900 text-cyan-300'
                    : m === 'burst' ? 'bg-fuchsia-900 text-fuchsia-300'
                    : 'bg-amber-900 text-amber-300'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === 'throttled' && (
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Rate Limit (requests/sec) *</label>
          <input
            type="number"
            value={rateLimit}
            onChange={e => setRateLimit(e.target.value)}
            placeholder="10"
            min="1"
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !captureId || !targetUrl}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium py-2 rounded transition-colors"
      >
        {loading ? 'Creating...' : 'Create Replay'}
      </button>
    </form>
  )
}
