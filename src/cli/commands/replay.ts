import type { Command } from 'commander'
import chalk from 'chalk'
import { createReplay, getReplay, listReplays, updateReplayStatus } from '../../storage/repositories/replays'
import { getReplaySummary } from '../../storage/repositories/results'
import { formatReplay, formatReplaySummary, formatTable } from '../utils/format'

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
    .action((opts) => {
      try {
        const job = createReplay({
          name: opts.name,
          capture_id: opts.capture,
          target_url: opts.target,
          mode: opts.mode,
          rate_limit: opts.rateLimit ? parseInt(opts.rateLimit, 10) : undefined,
        })
        console.log(chalk.green('Replay created:'))
        console.log(formatReplay(job))
        console.log(`\n  ID: ${chalk.cyan(job.id)}`)
        console.log(chalk.gray('  (Replay engine will be implemented in Phase 3)'))
      } catch (err) {
        console.error(chalk.red('Failed to create replay:'), err)
        process.exit(1)
      }
    })

  replay
    .command('list')
    .description('List all replay jobs')
    .option('-l, --limit <n>', 'Max results', '20')
    .action((opts) => {
      const replays = listReplays({ limit: parseInt(opts.limit, 10) })
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
    .action((id) => {
      const job = getReplay(id)
      if (!job) {
        console.error(chalk.red(`Replay not found: ${id}`))
        process.exit(1)
      }
      console.log(formatReplay(job))

      const summary = getReplaySummary(id)
      if (summary) {
        console.log('\n  Summary:')
        console.log(formatReplaySummary(summary))
      }
    })

  replay
    .command('cancel <id>')
    .description('Cancel a running replay')
    .action((id) => {
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
      console.log(chalk.yellow('Replay cancelled:'))
      console.log(formatReplay(updated!))
    })
}
