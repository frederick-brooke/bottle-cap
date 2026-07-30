import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { createReplay, getReplay, listReplays, updateReplayStatus } from '../../storage/repositories/replays'
import { getReplaySummary, getResultsByReplay } from '../../storage/repositories/results'
import { runReplay } from '../../replay/engine'
import { formatReplay, formatReplaySummary, formatTable, formatJson } from '../utils/format'

export function registerReplayCommand(program: Command): void {
  const replay = program
    .command('replay')
    .description('Manage replay jobs')

  replay
    .command('run')
    .description('Execute a replay against a target')
    .requiredOption('-c, --capture <id>', 'Capture ID to replay')
    .requiredOption('-t, --target <url>', 'Target URL')
    .option('-n, --name <name>', 'Replay name')
    .option('-m, --mode <mode>', 'Replay mode (paced|burst|throttled)', 'paced')
    .option('-r, --rate-limit <n>', 'Rate limit for throttled mode')
    .option('--reject-unauthorized', 'Verify TLS certificates (default: true)', true)
    .option('--no-reject-unauthorized', 'Skip TLS certificate verification')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      let spinner: ora.Ora | null = null
      let handleSigint: (() => void) | null = null
      try {
        const rateLimit = opts.rateLimit ? parseInt(opts.rateLimit, 10) : undefined
        if (rateLimit !== undefined && (isNaN(rateLimit) || rateLimit < 1)) {
          console.error(chalk.red('Rate limit must be a positive integer'))
          process.exit(1)
        }

        const job = createReplay({
          name: opts.name,
          capture_id: opts.capture,
          target_url: opts.target,
          mode: opts.mode,
          rate_limit: rateLimit,
        })

        if (!opts.json) {
          console.log(chalk.green('Replay created:'))
          console.log(formatReplay(job))
          console.log(`\n  ID: ${chalk.cyan(job.id)}`)
        }

        spinner = ora('Starting replay...').start()

        handleSigint = () => {
          if (spinner) spinner.fail('Replay cancelled')
          updateReplayStatus(job.id, 'failed')
          process.exit(1)
        }
        process.on('SIGINT', handleSigint)

        await runReplay(job.id, (completed, total) => {
          if (spinner) {
            spinner.text = `Replaying... ${completed}/${total} requests`
          }
        }, { rejectUnauthorized: opts.rejectUnauthorized })

        if (spinner) spinner.succeed('Replay completed')

        const summary = getReplaySummary(job.id)
        const results = getResultsByReplay(job.id)

        if (opts.json) {
          console.log(formatJson({ replay: job, summary, results }))
        } else {
          if (summary) {
            console.log('\n  Summary:')
            console.log(formatReplaySummary(summary))
          }

          if (results.length > 0) {
            console.log(chalk.bold('\n  Results:'))
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
            }
          }
        }
      } catch (err) {
        if (spinner) spinner.fail('Replay failed')
        console.error(chalk.red('Failed to run replay:'), err)
        process.exit(1)
      } finally {
        if (handleSigint) process.removeListener('SIGINT', handleSigint)
      }
    })

  replay
    .command('list')
    .description('List all replay jobs')
    .option('-l, --limit <n>', 'Max results', '20')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      const replays = listReplays({ limit: parseInt(opts.limit, 10) })
      if (opts.json) {
        console.log(formatJson({ replays }))
        return
      }
      if (replays.length === 0) {
        console.log(chalk.gray('No replays found.'))
        return
      }
      const rows = replays.map(r => [
        r.id.slice(0, 8),
        r.name || '-',
        r.capture_id.slice(0, 8),
        r.status,
        r.mode,
        `${r.completed_requests}/${r.total_requests}`,
        r.created_at,
      ])
      console.log(formatTable(['ID', 'Name', 'Capture', 'Status', 'Mode', 'Progress', 'Created'], rows))
    })

  replay
    .command('results <id>')
    .description('View replay results')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      const job = getReplay(id)
      if (!job) {
        console.error(chalk.red(`Replay not found: ${id}`))
        process.exit(1)
      }

      const summary = getReplaySummary(id)
      const results = getResultsByReplay(id)

      if (opts.json) {
        console.log(formatJson({ replay: job, summary, results }))
        return
      }

      console.log(formatReplay(job))
      if (summary) {
        console.log('\n  Summary:')
        console.log(formatReplaySummary(summary))
      }
    })

  replay
    .command('cancel <id>')
    .description('Cancel a running replay')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      const job = getReplay(id)
      if (!job) {
        console.error(chalk.red(`Replay not found: ${id}`))
        process.exit(1)
      }
      if (job.status !== 'running' && job.status !== 'pending') {
        console.error(chalk.red(`Replay cannot be cancelled (status: ${job.status})`))
        process.exit(1)
      }
      const updated = updateReplayStatus(id, 'failed')
      if (opts.json) {
        console.log(formatJson({ replay: updated }))
      } else {
        console.log(chalk.yellow('Replay cancelled:'))
        console.log(formatReplay(updated!))
      }
    })
}
