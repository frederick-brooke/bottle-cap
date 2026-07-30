import type { Command } from 'commander'
import chalk from 'chalk'
import { listCaptures } from '../../storage/repositories/captures'
import { listReplays } from '../../storage/repositories/replays'
import { formatTable, formatJson } from '../utils/format'

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List captures and replays')
    .option('-t, --type <type>', 'Filter by type (captures|replays)', 'captures')
    .option('-l, --limit <n>', 'Max results', '20')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      const limit = parseInt(opts.limit, 10)

      if (opts.type === 'replays') {
        const replays = listReplays({ limit })
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
      } else {
        const captures = listCaptures({ limit })
        if (opts.json) {
          console.log(formatJson({ captures }))
          return
        }
        if (captures.length === 0) {
          console.log(chalk.gray('No captures found.'))
          return
        }
        const rows = captures.map(c => [
          c.id.slice(0, 8),
          c.name || '-',
          c.service_name,
          c.status,
          String(c.request_count),
          c.started_at,
        ])
        console.log(formatTable(['ID', 'Name', 'Service', 'Status', 'Reqs', 'Started'], rows))
      }
    })
}
