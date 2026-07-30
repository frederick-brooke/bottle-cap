import type { Command } from 'commander'
import chalk from 'chalk'
import { getReplaySummary, getResultsByReplay } from '../../storage/repositories/results'
import { formatReplaySummary, formatJson } from '../utils/format'

export function registerDiffCommand(program: Command): void {
  program
    .command('diff <replayId>')
    .description('Compare original vs replayed responses')
    .option('--json', 'Output as JSON')
    .action(async (replayId, opts) => {
      const summary = getReplaySummary(replayId)
      if (!summary) {
        console.error(chalk.red(`Replay not found: ${replayId}`))
        process.exit(1)
      }

      const results = getResultsByReplay(replayId)

      if (opts.json) {
        console.log(formatJson({ summary, results }))
        return
      }

      console.log(chalk.bold('\nReplay Summary:'))
      console.log(formatReplaySummary(summary))

      if (results.length === 0) {
        console.log(chalk.gray('\nNo results to diff.'))
        return
      }

      console.log(chalk.bold('\nDetailed Results:'))
      for (const result of results) {
        const statusMatch = result.original_status != null && result.replayed_status != null
          && result.original_status === result.replayed_status
        const icon = result.error ? chalk.red('✗')
          : result.body_identical && statusMatch ? chalk.green('✓')
          : chalk.yellow('!')

        const originalStatus = result.original_status != null ? String(result.original_status) : '???'
        const replayedStatus = result.replayed_status != null ? String(result.replayed_status) : '???'
        const statusDiff = statusMatch ? '' : ` (was ${originalStatus})`
        const latency = result.replayed_latency_ms != null ? `${result.replayed_latency_ms.toFixed(1)}ms` : 'N/A'
        const truncated = result.truncated ? chalk.gray(' [truncated]') : ''
        console.log(`  ${icon} ${result.request_id.slice(0, 8)} → ${replayedStatus}${statusDiff} [${latency}]${truncated}${result.error ? ` ${chalk.red(result.error)}` : ''}`)

        if (result.body_diff_summary && !result.body_identical) {
          const bodyDiff = result.body_diff_summary as { added: number; removed: number; changed: number; details?: Array<{ path: string; kind: string; lhs?: unknown; rhs?: unknown }> }
          console.log(`    ${chalk.yellow(`Body diff: +${bodyDiff.added} -${bodyDiff.removed} ~${bodyDiff.changed}`)}`)
          if (bodyDiff.details) {
            for (const detail of bodyDiff.details.slice(0, 5)) {
              const color = detail.kind === 'added' ? chalk.green
                : detail.kind === 'removed' ? chalk.red
                : chalk.yellow
              console.log(`      ${color(`${detail.kind} ${detail.path}`)}`)
            }
            if (bodyDiff.details.length > 5) {
              console.log(chalk.gray(`      ... and ${bodyDiff.details.length - 5} more`))
            }
          }
        }
      }

      console.log('')
    })
}
