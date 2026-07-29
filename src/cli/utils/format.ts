import chalk from 'chalk'
import type { Capture, Replay, ReplaySummary } from '../../types'

export function formatCapture(capture: Capture): string {
  const statusColor = capture.status === 'active' ? chalk.green
    : capture.status === 'paused' ? chalk.yellow
    : chalk.red

  return [
    `  ${chalk.bold(capture.name || capture.id)}`,
    `    Service:    ${capture.service_name}`,
    `    Target:     ${capture.target_url}`,
    `    Status:     ${statusColor(capture.status)}`,
    `    Requests:   ${capture.request_count}`,
    `    Sample:     ${(capture.sample_rate * 100).toFixed(0)}%`,
    `    Started:    ${capture.started_at}`,
    capture.stopped_at ? `    Stopped:    ${capture.stopped_at}` : '',
  ].filter(Boolean).join('\n')
}

export function formatReplay(replay: Replay): string {
  const statusColor = replay.status === 'completed' ? chalk.green
    : replay.status === 'running' ? chalk.blue
    : replay.status === 'failed' ? chalk.red
    : chalk.gray

  return [
    `  ${chalk.bold(replay.name || replay.id)}`,
    `    Capture:    ${replay.capture_id}`,
    `    Target:     ${replay.target_url}`,
    `    Status:     ${statusColor(replay.status)}`,
    `    Mode:       ${replay.mode}`,
    `    Progress:   ${replay.completed_requests}/${replay.total_requests}`,
    `    Created:    ${replay.created_at}`,
  ].join('\n')
}

export function formatReplaySummary(summary: ReplaySummary): string {
  const passRate = summary.total > 0
    ? ((summary.identical / summary.total) * 100).toFixed(1)
    : '0.0'

  return [
    `  ${chalk.bold(summary.name || summary.replay_id)}`,
    `    Status:           ${summary.status}`,
    `    Mode:             ${summary.mode}`,
    `    Total:            ${summary.total}`,
    `    Identical:        ${chalk.green(summary.identical)} (${passRate}%)`,
    `    Status Changed:   ${chalk.yellow(summary.status_changed)}`,
    `    Errors:           ${chalk.red(summary.errors)}`,
    `    Avg Latency Δ:    ${summary.avg_latency_delta_ms != null ? summary.avg_latency_delta_ms.toFixed(1) + 'ms' : 'N/A'}`,
  ].join('\n')
}

export function formatTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || '').length))
  )

  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join('  ')
  const separator = colWidths.map(w => '─'.repeat(w)).join('──')
  const dataLines = rows.map(row =>
    row.map((cell, i) => cell.padEnd(colWidths[i])).join('  ')
  )

  return [headerLine, separator, ...dataLines].join('\n')
}
