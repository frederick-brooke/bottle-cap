'use client'

import Link from 'next/link'

function Endpoint({ method, path, description }: { method: string; path: string; description: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-900 text-emerald-300',
    POST: 'bg-blue-900 text-blue-300',
    DELETE: 'bg-red-900 text-red-300',
  }
  return (
    <div className="flex items-center gap-3 py-2 border-b border-zinc-800/50">
      <span className={`text-xs font-mono px-2 py-0.5 rounded ${colors[method] || 'bg-zinc-800 text-zinc-300'}`}>
        {method}
      </span>
      <code className="text-sm font-mono text-zinc-300">{path}</code>
      <span className="text-sm text-zinc-500 ml-auto">{description}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-zinc-100 mb-3 border-b border-zinc-800 pb-2">{title}</h2>
      {children}
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-zinc-200 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto text-sm font-mono text-zinc-300 my-3">
      {code}
    </pre>
  )
}

function ParamsTable({ params }: { params: Array<{ name: string; type: string; required: boolean; description: string; default?: string }> }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-xs border-b border-zinc-800">
            <th className="text-left py-2 px-2 font-medium">Parameter</th>
            <th className="text-left py-2 px-2 font-medium">Type</th>
            <th className="text-left py-2 px-2 font-medium">Description</th>
            <th className="text-left py-2 px-2 font-medium">Default</th>
          </tr>
        </thead>
        <tbody>
          {params.map(p => (
            <tr key={p.name} className="border-b border-zinc-800/50">
              <td className="py-1.5 px-2">
                <code className="text-amber-300 text-xs font-mono">{p.name}</code>
                {p.required && <span className="text-red-400 text-xs ml-1">*</span>}
              </td>
              <td className="py-1.5 px-2 text-zinc-500 font-mono text-xs">{p.type}</td>
              <td className="py-1.5 px-2 text-zinc-400">{p.description}</td>
              <td className="py-1.5 px-2 text-zinc-500 font-mono text-xs">{p.default || '---'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ApiDocsPage() {
  return (
    <main className="flex-1 bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 mb-2 inline-block">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100">API Reference</h1>
          <p className="text-sm text-zinc-500 mt-1">
            REST API for programmatic access to Bottle-Cap
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8">
          <p className="text-sm text-zinc-400 mb-2">
            Base URL: <code className="text-zinc-300 font-mono">http://localhost:3001</code>
          </p>
          <p className="text-sm text-zinc-400">
            Start the API server with: <code className="text-zinc-300 font-mono">npm run dev:api</code>
          </p>
        </div>

        <Section title="Authentication">
          <p className="text-sm text-zinc-400 mb-3">
            If <code className="text-zinc-300 font-mono">BOTTLECAP_API_KEY</code> is set, include the header:
          </p>
          <CodeBlock code="Authorization: Bearer <your-api-key>" />
          <p className="text-sm text-zinc-500 mt-2">
            If no API key is configured, authentication is skipped (local development mode).
          </p>
        </Section>

        <Section title="Endpoints">
          <SubSection title="Captures">
            <Endpoint method="POST" path="/api/captures" description="Create capture + start proxy" />
            <Endpoint method="GET" path="/api/captures" description="List captures (paginated)" />
            <Endpoint method="GET" path="/api/captures/:id" description="Get capture details" />
            <Endpoint method="DELETE" path="/api/captures/:id" description="Stop active capture" />
          </SubSection>

          <SubSection title="Replays">
            <Endpoint method="POST" path="/api/replays" description="Create replay (fire-and-forget)" />
            <Endpoint method="GET" path="/api/replays" description="List replays (paginated)" />
            <Endpoint method="GET" path="/api/replays/:id" description="Get replay + summary" />
            <Endpoint method="POST" path="/api/replays/:id/cancel" description="Cancel running replay" />
          </SubSection>

          <SubSection title="Results & Stats">
            <Endpoint method="GET" path="/api/results/:replayId" description="Get replay results + summary" />
            <Endpoint method="GET" path="/api/stats/:captureId" description="Capture statistics" />
          </SubSection>
        </Section>

        <Section title="POST /api/captures">
          <p className="text-sm text-zinc-400 mb-3">Create a capture session and start its proxy.</p>

          <SubSection title="Request Body">
            <ParamsTable params={[
              { name: 'serviceName', type: 'string', required: true, description: 'Service identifier' },
              { name: 'targetUrl', type: 'string', required: true, description: 'Target URL to proxy traffic to' },
              { name: 'name', type: 'string', required: false, description: 'Human-readable capture name' },
              { name: 'sampleRate', type: 'number', required: false, description: 'Sampling rate (0.0 - 1.0)', default: '1.0' },
              { name: 'port', type: 'number', required: false, description: 'Proxy listen port (0 for random)', default: '8080' },
            ]} />
          </SubSection>

          <SubSection title="Response (201)">
            <CodeBlock code={`{
  "capture": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "pre-deploy-capture",
    "status": "active",
    "service_name": "my-api",
    "target_url": "https://api.staging.example.com",
    "sample_rate": 1.0,
    "started_at": "2025-01-15T10:30:00.000Z",
    "stopped_at": null,
    "request_count": 0,
    "config": null
  },
  "proxyPort": 8080
}`} />
          </SubSection>

          <SubSection title="Errors">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-1 text-sm">
              <div><code className="text-amber-300">400</code> <span className="text-zinc-500">— Missing serviceName/targetUrl or invalid sampleRate/port</span></div>
              <div><code className="text-amber-300">409</code> <span className="text-zinc-500">— Port already in use</span></div>
              <div><code className="text-amber-300">500</code> <span className="text-zinc-500">— Server error</span></div>
            </div>
          </SubSection>
        </Section>

        <Section title="GET /api/captures">
          <p className="text-sm text-zinc-400 mb-3">List captures with pagination.</p>

          <SubSection title="Query Parameters">
            <ParamsTable params={[
              { name: 'limit', type: 'number', required: false, description: 'Max results to return', default: '50' },
              { name: 'offset', type: 'number', required: false, description: 'Pagination offset', default: '0' },
            ]} />
          </SubSection>

          <SubSection title="Response (200)">
            <CodeBlock code={`{
  "captures": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "pre-deploy-capture",
      "status": "active",
      "service_name": "my-api",
      "target_url": "https://api.staging.example.com",
      "sample_rate": 1.0,
      "started_at": "2025-01-15T10:30:00.000Z",
      "stopped_at": null,
      "request_count": 42,
      "config": null,
      "isActive": true,
      "proxyPort": 8080
    }
  ]
}`} />
          </SubSection>
        </Section>

        <Section title="GET /api/captures/:id">
          <p className="text-sm text-zinc-400 mb-3">Get a single capture by ID.</p>

          <SubSection title="Response (200)">
            <CodeBlock code={`{
  "capture": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "pre-deploy-capture",
    "status": "active",
    "service_name": "my-api",
    ...
    "isActive": true,
    "proxyPort": 8080
  }
}`} />
          </SubSection>

          <SubSection title="Errors">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm">
              <code className="text-amber-300">404</code> <span className="text-zinc-500">— Capture not found</span>
            </div>
          </SubSection>
        </Section>

        <Section title="DELETE /api/captures/:id">
          <p className="text-sm text-zinc-400 mb-3">Stop an active capture&apos;s proxy and mark it completed.</p>

          <SubSection title="Response (200)">
            <CodeBlock code={`{
  "capture": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "stopped_at": "2025-01-15T10:35:00.000Z",
    ...
  }
}`} />
          </SubSection>

          <SubSection title="Errors">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-1 text-sm">
              <div><code className="text-amber-300">404</code> <span className="text-zinc-500">— Capture not found</span></div>
              <div><code className="text-amber-300">409</code> <span className="text-zinc-500">— Capture is not active</span></div>
            </div>
          </SubSection>
        </Section>

        <Section title="POST /api/replays">
          <p className="text-sm text-zinc-400 mb-3">
            Create and start a replay job. Returns <code className="text-zinc-300">202</code> immediately; poll GET for status.
          </p>

          <SubSection title="Request Body">
            <ParamsTable params={[
              { name: 'captureId', type: 'string', required: true, description: 'Capture ID to replay' },
              { name: 'targetUrl', type: 'string', required: true, description: 'Target URL for replay' },
              { name: 'name', type: 'string', required: false, description: 'Replay name' },
              { name: 'mode', type: 'string', required: false, description: 'paced, burst, or throttled', default: 'paced' },
              { name: 'rateLimit', type: 'number', required: false, description: 'Required for throttled mode' },
              { name: 'rejectUnauthorized', type: 'boolean', required: false, description: 'Verify TLS certificates', default: 'true' },
            ]} />
          </SubSection>

          <SubSection title="Response (202)">
            <CodeBlock code={`{
  "replay": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "post-fix-verify",
    "capture_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "target_url": "https://api.staging-fixed.example.com",
    "mode": "burst",
    "rate_limit": null,
    "config": null,
    "started_at": null,
    "completed_at": null,
    "total_requests": 0,
    "completed_requests": 0,
    "created_at": "2025-01-15T10:35:00.000Z",
    "triggered_by": "api"
  }
}`} />
          </SubSection>
        </Section>

        <Section title="GET /api/replays">
          <p className="text-sm text-zinc-400 mb-3">List replays with pagination.</p>

          <SubSection title="Query Parameters">
            <ParamsTable params={[
              { name: 'limit', type: 'number', required: false, description: 'Max results', default: '50' },
              { name: 'offset', type: 'number', required: false, description: 'Pagination offset', default: '0' },
            ]} />
          </SubSection>
        </Section>

        <Section title="GET /api/replays/:id">
          <p className="text-sm text-zinc-400 mb-3">Get a single replay with its summary.</p>

          <SubSection title="Response (200)">
            <CodeBlock code={`{
  "replay": { ... },
  "summary": {
    "replay_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "post-fix-verify",
    "status": "completed",
    "mode": "burst",
    "total": 42,
    "identical": 40,
    "status_changed": 1,
    "errors": 1,
    "avg_latency_delta_ms": -5.2
  }
}`} />
          </SubSection>

          <p className="text-sm text-zinc-500 mt-2">
            Note: <code className="text-zinc-400">summary</code> may be <code className="text-zinc-400">null</code> if no results exist yet.
          </p>
        </Section>

        <Section title="POST /api/replays/:id/cancel">
          <p className="text-sm text-zinc-400 mb-3">Cancel a running or pending replay.</p>

          <SubSection title="Response (200)">
            <CodeBlock code={`{
  "replay": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "failed",
    ...
  }
}`} />
          </SubSection>

          <SubSection title="Errors">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-1 text-sm">
              <div><code className="text-amber-300">404</code> <span className="text-zinc-500">— Replay not found</span></div>
              <div><code className="text-amber-300">409</code> <span className="text-zinc-500">— Replay cannot be cancelled (already completed/failed)</span></div>
            </div>
          </SubSection>
        </Section>

        <Section title="GET /api/results/:replayId">
          <p className="text-sm text-zinc-400 mb-3">Get detailed results for a replay.</p>

          <SubSection title="Response (200)">
            <CodeBlock code={`{
  "results": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "replay_id": "660e8400-e29b-41d4-a716-446655440001",
      "request_id": "880e8400-e29b-41d4-a716-446655440003",
      "original_status": 200,
      "replayed_status": 200,
      "original_latency_ms": 50.2,
      "replayed_latency_ms": 45.1,
      "body_diff_summary": null,
      "body_identical": true,
      "truncated": false,
      "error": null,
      "replayed_at": "2025-01-15T10:35:05.000Z"
    }
  ],
  "summary": {
    "total": 42,
    "identical": 40,
    "status_changed": 1,
    "errors": 1,
    "avg_latency_delta_ms": -5.2
  }
}`} />
          </SubSection>
        </Section>

        <Section title="GET /api/stats/:captureId">
          <p className="text-sm text-zinc-400 mb-3">Get statistics for a capture with all its replays.</p>

          <SubSection title="Response (200)">
            <CodeBlock code={`{
  "capture": { ... },
  "requestCount": 150,
  "replays": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "status": "completed",
      "mode": "burst",
      "summary": {
        "total": 150,
        "identical": 140,
        "status_changed": 5,
        "errors": 5,
        "avg_latency_delta_ms": -3.1
      }
    }
  ]
}`} />
          </SubSection>
        </Section>

        <Section title="Error Format">
          <p className="text-sm text-zinc-400 mb-3">All errors return a consistent JSON shape:</p>
          <CodeBlock code={`{ "error": "Description of what went wrong" }`} />

          <div className="overflow-x-auto my-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                  <th className="text-left py-2 px-2 font-medium">Status</th>
                  <th className="text-left py-2 px-2 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-1.5 px-2"><code className="text-amber-300">400</code></td>
                  <td className="py-1.5 px-2 text-zinc-400">Bad request / validation error</td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-1.5 px-2"><code className="text-amber-300">401</code></td>
                  <td className="py-1.5 px-2 text-zinc-400">Authentication required or invalid</td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-1.5 px-2"><code className="text-amber-300">404</code></td>
                  <td className="py-1.5 px-2 text-zinc-400">Resource not found</td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-1.5 px-2"><code className="text-amber-300">409</code></td>
                  <td className="py-1.5 px-2 text-zinc-400">Conflict (port in use, replay already completed)</td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-1.5 px-2"><code className="text-amber-300">500</code></td>
                  <td className="py-1.5 px-2 text-zinc-400">Internal server error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Quick Start">
          <CodeBlock code={`# Start the API server\nnpm run dev:api\n\n# Create a capture\ncurl -X POST http://localhost:3001/api/captures \\\n  -H "Content-Type: application/json" \\\n  -d '{"serviceName":"my-api","targetUrl":"https://api.staging.example.com","port":0}'\n\n# List captures\ncurl http://localhost:3001/api/captures\n\n# Start a replay\ncurl -X POST http://localhost:3001/api/replays \\\n  -H "Content-Type: application/json" \\\n  -d '{"captureId":"<capture-id>","targetUrl":"https://api.staging-fixed.example.com","mode":"burst"}'\n\n# Check replay status\ncurl http://localhost:3001/api/replays/<replay-id>\n\n# Get results\ncurl http://localhost:3001/api/results/<replay-id>`} />
        </Section>

        <div className="mt-10 pt-6 border-t border-zinc-800">
          <Link href="/docs/cli" className="text-sm text-emerald-400 hover:text-emerald-300">
            ← CLI Reference
          </Link>
        </div>
      </div>
    </main>
  )
}
