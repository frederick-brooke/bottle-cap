'use client'

import { useState } from 'react'

interface CaptureFormProps {
  onSubmit: (input: {
    name: string
    serviceName: string
    targetUrl: string
    sampleRate: number
    port: number
  }) => Promise<void>
  loading?: boolean
}

export function CaptureForm({ onSubmit, loading }: CaptureFormProps) {
  const [name, setName] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [sampleRate, setSampleRate] = useState('1.0')
  const [port, setPort] = useState('8080')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      name,
      serviceName,
      targetUrl,
      sampleRate: parseFloat(sampleRate),
      port: parseInt(port, 10),
    })
    setName('')
    setServiceName('')
    setTargetUrl('')
    setSampleRate('1.0')
    setPort('8080')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="pre-deploy-capture"
            className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Service</label>
          <input
            type="text"
            value={serviceName}
            onChange={e => setServiceName(e.target.value)}
            placeholder="api-gateway"
            required
            className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Target URL</label>
        <input
          type="text"
          value={targetUrl}
          onChange={e => setTargetUrl(e.target.value)}
          placeholder="https://api.staging.example.com"
          required
          className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Port</label>
          <input
            type="number"
            value={port}
            onChange={e => setPort(e.target.value)}
            min="1"
            max="65535"
            className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Sample Rate</label>
          <input
            type="number"
            value={sampleRate}
            onChange={e => setSampleRate(e.target.value)}
            min="0"
            max="1"
            step="0.1"
            className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded transition-colors"
      >
        {loading ? 'Starting...' : 'Start Capture'}
      </button>
    </form>
  )
}
