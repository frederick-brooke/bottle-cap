import chalk from 'chalk'
import type { Capture, Replay, ReplaySummary } from '../../types'

export function formatMode(mode: string): string {
  switch (mode) {
    case 'paced': return chalk.cyan('paced')
    case 'burst': return chalk.magenta('burst')
    case 'throttled': return chalk.yellow('throttled')
    default: return mode
  }
}

export function formatStatusBadge(status: string): string {
  switch (status) {
    case 'active':
    case 'completed': return chalk.green(`✓ ${status}`)
    case 'running': return chalk.blue(`● ${status}`)
    case 'failed': return chalk.red(`✗ ${status}`)
    case 'pending': return chalk.gray(`○ ${status}`)
    case 'paused': return chalk.yellow(`◌ ${status}`)
    default: return status
  }
}

export function formatStatusCode(code: number | null): string {
  if (code === null) return chalk.gray('???')
  if (code >= 200 && code < 300) return chalk.green(String(code))
  if (code >= 300 && code < 400) return chalk.cyan(String(code))
  if (code >= 400 && code < 500) return chalk.yellow(String(code))
  if (code >= 500) return chalk.red(String(code))
  return String(code)
}

export function formatLatencyDelta(originalMs: number | null, replayedMs: number | null): string {
  if (originalMs === null || replayedMs === null) return chalk.gray('N/A')
  const delta = replayedMs - originalMs
  const sign = delta >= 0 ? '+' : ''
  const color = delta > 0 ? chalk.yellow : delta < 0 ? chalk.green : chalk.gray
  return `${replayedMs.toFixed(1)}ms (${color(`${sign}${delta.toFixed(1)}ms`)})`
}

function formatProgressBar(ratio: number, width: number = 20): string {
  const filled = Math.round(ratio * width)
  const empty = width - filled
  const filledColor = ratio >= 0.8 ? chalk.green : ratio >= 0.5 ? chalk.yellow : chalk.red
  return `${filledColor('█'.repeat(filled))}${chalk.gray('░'.repeat(empty))}`
}

export function formatCapture(capture: Capture): string {
  return [
    `  ${chalk.bold(capture.name || capture.id)}`,
    `    Service:    ${capture.service_name}`,
    `    Target:     ${chalk.cyan(capture.target_url)}`,
    `    Status:     ${formatStatusBadge(capture.status)}`,
    `    Requests:   ${capture.request_count}`,
    `    Sample:     ${(capture.sample_rate * 100).toFixed(0)}%`,
    `    Started:    ${capture.started_at}`,
    capture.stopped_at ? `    Stopped:    ${capture.stopped_at}` : '',
  ].filter(Boolean).join('\n')
}

export function formatReplay(replay: Replay): string {
  return [
    `  ${chalk.bold(replay.name || replay.id)}`,
    `    Capture:    ${replay.capture_id}`,
    `    Target:     ${chalk.cyan(replay.target_url)}`,
    `    Status:     ${formatStatusBadge(replay.status)}`,
    `    Mode:       ${formatMode(replay.mode)}`,
    `    Progress:   ${replay.completed_requests}/${replay.total_requests}`,
    `    Created:    ${replay.created_at}`,
  ].join('\n')
}

export function formatReplaySummary(summary: ReplaySummary): string {
  const passRate = summary.total > 0
    ? ((summary.identical / summary.total) * 100)
    : 0
  const bar = formatProgressBar(passRate / 100)

  return [
    `  ${chalk.bold(summary.name || summary.replay_id)}`,
    `    Status:           ${formatStatusBadge(summary.status)}`,
    `    Mode:             ${formatMode(summary.mode)}`,
    `    Pass Rate:        ${bar} ${passRate.toFixed(1)}%`,
    `    Total:            ${summary.total}`,
    `    Identical:        ${chalk.green(summary.identical)}`,
    `    Status Changed:   ${chalk.yellow(summary.status_changed)}`,
    `    Errors:           ${chalk.red(summary.errors)}`,
    `    Avg Latency Δ:    ${summary.avg_latency_delta_ms != null ? summary.avg_latency_delta_ms.toFixed(1) + 'ms' : 'N/A'}`,
  ].join('\n')
}

export function formatTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || '').length)),
  )

  const headerLine = chalk.bold(headers.map((h, i) => h.padEnd(colWidths[i])).join('  '))
  const separator = colWidths.map(w => '─'.repeat(w)).join('──')
  const dataLines = rows.map(row =>
    row.map((cell, i) => cell.padEnd(colWidths[i])).join('  '),
  )

  return [headerLine, separator, ...dataLines].join('\n')
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2)
}
