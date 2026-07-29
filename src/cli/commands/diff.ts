import type { Command } from 'commander'
import chalk from 'chalk'
import { getReplaySummary, getResultsByReplay } from '../../storage/repositories/results'
import { formatReplaySummary } from '../utils/format'

export function registerDiffCommand(program: Command): void {
  program
    .command('diff <replayId>')
    .description('Compare original vs replayed responses')
    .action((replayId) => {
      const summary = getReplaySummary(replayId)
      if (!summary) {
        console.error(chalk.red(`Replay not found: ${replayId}`))
        process.exit(1)
      }

      console.log(chalk.bold('\nReplay Summary:'))
      console.log(formatReplaySummary(summary))

      const results = getResultsByReplay(replayId)
      if (results.length === 0) {
        console.log(chalk.gray('\nNo results to diff.'))
        return
      }

      console.log(chalk.bold('\nDetailed Results:'))
      for (const result of results) {
        const statusMatch = result.original_status === result.replayed_status
        const icon = result.error ? chalk.red('✗')
          : result.body_identical && statusMatch ? chalk.green('✓')
          : chalk.yellow('!')

        const statusDiff = statusMatch ? '' : ` (was ${result.original_status})`
        const latency = result.replayed_latency_ms != null ? `${result.replayed_latency_ms.toFixed(1)}ms` : 'N/A'

        console.log(`  ${icon} ${result.request_id.slice(0, 8)} → ${result.replayed_status}${statusDiff} [${latency}]${result.error ? ` ${chalk.red(result.error)}` : ''}`)
      }

      console.log(chalk.gray('\n  (Full body diff engine will be implemented in Phase 3)'))
    })
}
