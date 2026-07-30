'use client'

import { useState, useEffect, useCallback } from 'react'
import { captureApi, type CaptureWithStatus, type TestResponse } from '@/web/lib/api'
import { CaptureForm } from '@/web/components/CaptureForm'
import { CaptureList } from '@/web/components/CaptureList'
import { RequestList } from '@/web/components/RequestList'
import { RequestDetail } from '@/web/components/RequestDetail'
import type { HttpRequest } from '@/types'

export default function DebugPage() {
  const [captures, setCaptures] = useState<CaptureWithStatus[]>([])
  const [selectedCaptureId, setSelectedCaptureId] = useState<string | null>(null)
  const [requests, setRequests] = useState<HttpRequest[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [requestDetail, setRequestDetail] = useState<{ request: HttpRequest; requestBody: string | null; responseBody: string | null } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [testCaptureId, setTestCaptureId] = useState('')
  const [testMethod, setTestMethod] = useState('GET')
  const [testPath, setTestPath] = useState('/')
  const [testHeaders, setTestHeaders] = useState('{}')
  const [testBody, setTestBody] = useState('')
  const [testResponse, setTestResponse] = useState<TestResponse | null>(null)
  const [testLoading, setTestLoading] = useState(false)

  const fetchCaptures = useCallback(async () => {
    try {
      const data = await captureApi.listCaptures()
      setCaptures(data.captures)
    } catch { /* silent */ }
  }, [])

  const fetchRequests = useCallback(async (captureId: string) => {
    try {
      const data = await captureApi.getCaptureRequests(captureId)
      setRequests(data.requests)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCaptures()
    const interval = setInterval(fetchCaptures, 2000)
    return () => clearInterval(interval)
  }, [fetchCaptures])

  useEffect(() => {
    if (!selectedCaptureId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRequests([])
      setSelectedRequestId(null)
      setRequestDetail(null)
      return
    }
    fetchRequests(selectedCaptureId)
    const interval = setInterval(() => fetchRequests(selectedCaptureId), 2000)
    return () => clearInterval(interval)
  }, [selectedCaptureId, fetchRequests])

  const handleStartCapture = async (input: {
    name: string; serviceName: string; targetUrl: string; sampleRate: number; port: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      await captureApi.startCapture(input)
      await fetchCaptures()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleStopCapture = async (id: string) => {
    try {
      await captureApi.stopCapture(id)
      await fetchCaptures()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleSelectCapture = (id: string) => {
    setSelectedCaptureId(id === selectedCaptureId ? null : id)
    setSelectedRequestId(null)
    setRequestDetail(null)
    setTestCaptureId(id)
  }

  const handleSelectRequest = async (id: string) => {
    setSelectedRequestId(id)
    try {
      const data = await captureApi.getRequestDetail(id)
      setRequestDetail(data)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    setTestLoading(true)
    setTestResponse(null)
    setError(null)
    try {
      let parsedHeaders: Record<string, string> = {}
      try {
        parsedHeaders = JSON.parse(testHeaders)
      } catch { /* use empty */ }

      const data = await captureApi.sendTestRequest({
        captureId: testCaptureId,
        method: testMethod,
        path: testPath,
        headers: parsedHeaders,
        body: testBody || undefined,
      })
      setTestResponse(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-zinc-100">Capture Console</h1>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded px-4 py-2 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-300">dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Start Capture</h2>
            <CaptureForm onSubmit={handleStartCapture} loading={loading} />
          </section>

          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Captures</h2>
            <CaptureList
              captures={captures}
              onStop={handleStopCapture}
              onSelect={handleSelectCapture}
              selectedId={selectedCaptureId || undefined}
            />
          </section>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Test Request</h2>
            <form onSubmit={handleSendTest} className="space-y-3">
              <div className="grid grid-cols-[auto_1fr] gap-2 items-end">
                <div className="w-24">
                  <label className="block text-xs text-zinc-500 mb-1">Method</label>
                  <select
                    value={testMethod}
                    onChange={e => setTestMethod(e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100"
                  >
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Path</label>
                  <input
                    type="text"
                    value={testPath}
                    onChange={e => setTestPath(e.target.value)}
                    placeholder="/api/users"
                    className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Capture</label>
                  <select
                    value={testCaptureId}
                    onChange={e => setTestCaptureId(e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100"
                  >
                    <option value="">Select capture</option>
                    {captures.filter(c => c.isActive).map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.id.slice(0, 8)} (:{c.proxyPort})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Headers (JSON)</label>
                  <input
                    type="text"
                    value={testHeaders}
                    onChange={e => setTestHeaders(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Body</label>
                <textarea
                  value={testBody}
                  onChange={e => setTestBody(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 font-mono resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={testLoading || !testCaptureId}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded transition-colors"
              >
                {testLoading ? 'Sending...' : 'Send Request'}
              </button>
            </form>

            {testResponse && (
              <div className="mt-3 bg-zinc-950 border border-zinc-800 rounded p-3">
                <div className="flex items-center gap-3 text-sm mb-2">
                  <span className={`font-mono font-bold ${
                    testResponse.statusCode < 300 ? 'text-emerald-400' :
                    testResponse.statusCode < 400 ? 'text-blue-400' :
                    testResponse.statusCode < 500 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {testResponse.statusCode}
                  </span>
                  <span className="text-zinc-400 tabular-nums">{testResponse.latencyMs}ms</span>
                </div>
                <pre className="text-xs text-zinc-300 font-mono overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                  {(() => { try { return JSON.stringify(JSON.parse(testResponse.body), null, 2) } catch { return testResponse.body } })()}
                </pre>
              </div>
            )}
          </section>

          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              Captured Requests
              {selectedCaptureId && <span className="text-zinc-500 font-normal ml-2">({requests.length})</span>}
            </h2>
            {!selectedCaptureId ? (
              <p className="text-zinc-500 text-sm py-4 text-center">Select a capture to view requests.</p>
            ) : (
              <RequestList
                requests={requests}
                capture={captures.find(c => c.id === selectedCaptureId)}
                onSelect={handleSelectRequest}
                selectedId={selectedRequestId || undefined}
              />
            )}
          </section>

          {requestDetail && (
            <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-zinc-300 mb-3">Request Detail</h2>
              <RequestDetail
                request={requestDetail.request}
                requestBody={requestDetail.requestBody}
                responseBody={requestDetail.responseBody}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
