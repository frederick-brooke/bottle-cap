'use client'

import Link from 'next/link'

function Cmd({ children }: { children: React.ReactNode }) {
  return <code className="bg-zinc-800 text-emerald-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
}

function Flag({ children }: { children: React.ReactNode }) {
  return <code className="bg-zinc-800 text-amber-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
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

function OptionsTable({ options }: { options: Array<{ flag: string; description: string; default?: string; required?: boolean }> }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-xs border-b border-zinc-800">
            <th className="text-left py-2 px-2 font-medium">Flag</th>
            <th className="text-left py-2 px-2 font-medium">Description</th>
            <th className="text-left py-2 px-2 font-medium">Default</th>
          </tr>
        </thead>
        <tbody>
          {options.map(opt => (
            <tr key={opt.flag} className="border-b border-zinc-800/50">
              <td className="py-1.5 px-2">
                <Flag>{opt.flag}</Flag>
                {opt.required && <span className="text-red-400 text-xs ml-1">*</span>}
              </td>
              <td className="py-1.5 px-2 text-zinc-400">{opt.description}</td>
              <td className="py-1.5 px-2 text-zinc-500 font-mono text-xs">{opt.default || '---'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CliDocsPage() {
  return (
    <main className="flex-1 bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 mb-2 inline-block">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100">CLI Reference</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Command-line interface for Bottle-Cap incident replay tool
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8">
          <p className="text-sm text-zinc-400">
            All commands are run via <Cmd>bottlecap</Cmd> or <Cmd>npm run cli --</Cmd>
          </p>
          <CodeBlock code="npm run cli -- <command> [options]" />
        </div>

        <Section title="capture start">
          <p className="text-sm text-zinc-400 mb-3">Start a new capture session to record HTTP traffic through a proxy.</p>

          <SubSection title="Usage">
            <CodeBlock code={`bottlecap capture start \\\n  --name "pre-deploy" \\\n  --service "my-api" \\\n  --target https://api.staging.example.com \\\n  --port 8080`} />
          </SubSection>

          <SubSection title="Options">
            <OptionsTable options={[
              { flag: '-n, --name <name>', description: 'Capture name', required: true },
              { flag: '-s, --service <service>', description: 'Service name', required: true },
              { flag: '-t, --target <url>', description: 'Target URL to proxy traffic to', required: true },
              { flag: '-r, --sample-rate <rate>', description: 'Sampling rate (0-1)', default: '1.0' },
              { flag: '-p, --port <port>', description: 'Port to listen on', default: '8080' },
              { flag: '-d, --daemon', description: 'Run in background (daemon mode)', default: 'false' },
            ]} />
          </SubSection>

          <SubSection title="Examples">
            <CodeBlock code={`# Start capture in foreground (Ctrl+C to stop)\nbottlecap capture start -n "pre-deploy" -s "my-api" -t https://staging.example.com\n\n# Start capture in daemon mode\nbottlecap capture start -n "pre-deploy" -s "my-api" -t https://staging.example.com --daemon\n\n# Custom port and sample rate\nbottlecap capture start -n "test" -s "api" -t https://staging.example.com -p 9090 -r 0.5`} />
          </SubSection>
        </Section>

        <Section title="capture stop">
          <p className="text-sm text-zinc-400 mb-3">Stop a running capture session.</p>

          <SubSection title="Usage">
            <CodeBlock code="bottlecap capture stop <id>" />
          </SubSection>

          <SubSection title="Options">
            <OptionsTable options={[
              { flag: '--json', description: 'Output as JSON', default: 'false' },
            ]} />
          </SubSection>

          <SubSection title="Examples">
            <CodeBlock code={`# Stop a capture by ID (full or first 8 chars)\nbottlecap capture stop 550e8400\n\n# Stop and get JSON output\nbottlecap capture stop 550e8400 --json`} />
          </SubSection>
        </Section>

        <Section title="capture list">
          <p className="text-sm text-zinc-400 mb-3">List all capture sessions.</p>

          <SubSection title="Usage">
            <CodeBlock code="bottlecap capture list [options]" />
          </SubSection>

          <SubSection title="Options">
            <OptionsTable options={[
              { flag: '-l, --limit <n>', description: 'Max results to return', default: '20' },
              { flag: '--json', description: 'Output as JSON', default: 'false' },
            ]} />
          </SubSection>
        </Section>

        <Section title="capture inspect">
          <p className="text-sm text-zinc-400 mb-3">View detailed information about a capture session.</p>

          <SubSection title="Usage">
            <CodeBlock code="bottlecap capture inspect <id>" />
          </SubSection>

          <SubSection title="Options">
            <OptionsTable options={[
              { flag: '--json', description: 'Output as JSON', default: 'false' },
            ]} />
          </SubSection>
        </Section>

        <Section title="replay run">
          <p className="text-sm text-zinc-400 mb-3">Execute a replay of captured traffic against a target URL.</p>

          <SubSection title="Usage">
            <CodeBlock code={`bottlecap replay run \\\n  --capture "pre-deploy" \\\n  --target https://api.staging-fixed.example.com \\\n  --mode burst`} />
          </SubSection>

          <SubSection title="Options">
            <OptionsTable options={[
              { flag: '-c, --capture <id>', description: 'Capture ID to replay', required: true },
              { flag: '-t, --target <url>', description: 'Target URL for replay', required: true },
              { flag: '-n, --name <name>', description: 'Replay name' },
              { flag: '-m, --mode <mode>', description: 'Replay mode: paced, burst, or throttled', default: 'paced' },
              { flag: '-r, --rate-limit <n>', description: 'Rate limit for throttled mode (requests/sec)' },
              { flag: '--no-reject-unauthorized', description: 'Skip TLS certificate verification', default: 'false' },
              { flag: '--json', description: 'Output as JSON', default: 'false' },
            ]} />
          </SubSection>

          <SubSection title="Replay Modes">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2 text-sm">
              <div>
                <span className="text-cyan-400 font-medium">paced</span>
                <span className="text-zinc-500"> — Replay requests with original timing between them</span>
              </div>
              <div>
                <span className="text-fuchsia-400 font-medium">burst</span>
                <span className="text-zinc-500"> — Replay as fast as possible (max concurrency)</span>
              </div>
              <div>
                <span className="text-amber-400 font-medium">throttled</span>
                <span className="text-zinc-500"> — Rate-limited replay (requires <Flag>--rate-limit</Flag>)</span>
              </div>
            </div>
          </SubSection>

          <SubSection title="Examples">
            <CodeBlock code={`# Paced replay (original timing)\nbottlecap replay run -c 550e8400 -t https://staging-fixed.example.com\n\n# Burst mode (fastest)\nbottlecap replay run -c 550e8400 -t https://staging-fixed.example.com -m burst\n\n# Throttled at 50 requests/sec\nbottlecap replay run -c 550e8400 -t https://staging-fixed.example.com -m throttled -r 50\n\n# Skip TLS verification for self-signed certs\nnbottlecap replay run -c 550e8400 -t https://staging.local:8443 --no-reject-unauthorized`} />
          </SubSection>
        </Section>

        <Section title="replay list">
          <p className="text-sm text-zinc-400 mb-3">List all replay jobs.</p>

          <SubSection title="Usage">
            <CodeBlock code="bottlecap replay list [options]" />
          </SubSection>

          <SubSection title="Options">
            <OptionsTable options={[
              { flag: '-l, --limit <n>', description: 'Max results to return', default: '20' },
              { flag: '--json', description: 'Output as JSON', default: 'false' },
            ]} />
          </SubSection>
        </Section>

        <Section title="replay results">
          <p className="text-sm text-zinc-400 mb-3">View detailed results of a completed replay.</p>

          <SubSection title="Usage">
            <CodeBlock code="bottlecap replay results <id>" />
          </SubSection>

          <SubSection title="Options">
            <OptionsTable options={[
              { flag: '--json', description: 'Output as JSON', default: 'false' },
            ]} />
          </SubSection>
        </Section>

        <Section title="replay cancel">
          <p className="text-sm text-zinc-400 mb-3">Cancel a running or pending replay.</p>

          <SubSection title="Usage">
            <CodeBlock code="bottlecap replay cancel <id>" />
          </SubSection>

          <SubSection title="Options">
            <OptionsTable options={[
              { flag: '--json', description: 'Output as JSON', default: 'false' },
            ]} />
          </SubSection>
        </Section>

        <Section title="diff">
          <p className="text-sm text-zinc-400 mb-3">Compare original vs replayed responses for a replay.</p>

          <SubSection title="Usage">
            <CodeBlock code="bottlecap diff <replay-id>" />
          </SubSection>

          <SubSection title="Options">
            <OptionsTable options={[
              { flag: '--json', description: 'Output as JSON', default: 'false' },
            ]} />
          </SubSection>

          <SubSection title="Output">
            <p className="text-sm text-zinc-400 mb-2">Results are displayed with status icons:</p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-1 text-sm font-mono">
              <div><span className="text-emerald-400">✓</span> <span className="text-zinc-500">Identical response (body + status match)</span></div>
              <div><span className="text-amber-400">!</span> <span className="text-zinc-500">Changed response (body or status differs)</span></div>
              <div><span className="text-red-400">✗</span> <span className="text-zinc-500">Error during replay</span></div>
            </div>
          </SubSection>
        </Section>

        <Section title="list">
          <p className="text-sm text-zinc-400 mb-3">List captures or replays (shorthand).</p>

          <SubSection title="Usage">
            <CodeBlock code="bottlecap list [options]" />
          </SubSection>

          <SubSection title="Options">
            <OptionsTable options={[
              { flag: '-t, --type <type>', description: 'Filter by type: captures or replays', default: 'captures' },
              { flag: '-l, --limit <n>', description: 'Max results to return', default: '20' },
              { flag: '--json', description: 'Output as JSON', default: 'false' },
            ]} />
          </SubSection>
        </Section>

        <Section title="migrate">
          <p className="text-sm text-zinc-400 mb-3">Run database migrations. Migrations run automatically on first use, but you can run them manually.</p>

          <SubSection title="Usage">
            <CodeBlock code="bottlecap migrate" />
          </SubSection>
        </Section>

        <Section title="Global Options">
          <SubSection title="Options">
            <OptionsTable options={[
              { flag: '-V, --version', description: 'Output the version number' },
              { flag: '-h, --help', description: 'Display help for command' },
            ]} />
          </SubSection>
        </Section>

        <div className="mt-10 pt-6 border-t border-zinc-800">
          <Link href="/docs/api" className="text-sm text-emerald-400 hover:text-emerald-300">
            API Reference →
          </Link>
        </div>
      </div>
    </main>
  )
}
