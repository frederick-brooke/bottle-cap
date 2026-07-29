import { Command } from 'commander'
import { registerCaptureCommand } from './commands/capture'
import { registerReplayCommand } from './commands/replay'
import { registerListCommand } from './commands/list'
import { registerDiffCommand } from './commands/diff'
import { getDatabase, closeDatabase, runMigrations } from '../storage/database'

const program = new Command()

program
  .name('bottlecap')
  .description('Incident Replay Tool - Capture production HTTP traffic, replay against staging')
  .version('0.1.0')
  .hook('preAction', () => {
    getDatabase()
  })
  .hook('postAction', () => {
    closeDatabase()
  })

registerCaptureCommand(program)
registerReplayCommand(program)
registerListCommand(program)
registerDiffCommand(program)

program
  .command('migrate')
  .description('Run database migrations')
  .action(() => {
    runMigrations()
    closeDatabase()
  })

program.parse(process.argv)
