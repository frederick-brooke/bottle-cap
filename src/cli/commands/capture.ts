import type { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { createCapture, getCapture, listCaptures, updateCaptureStatus } from '../../storage/repositories/captures'
import { createProxyServer } from '../../proxy/server'
import type { CaptureSession } from '../../proxy/types'
import { formatCapture, formatTable } from '../utils/format'
import config from '../../../bottlecap.config'

function getPidPath(captureId: string): string {
  return path.resolve(config.proxy.daemonPidDir, `${captureId}.pid`)
}

function writePidFile(captureId: string): void {
  const pidPath = getPidPath(captureId)
  const dir = path.dirname(pidPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(pidPath, String(process.pid))
}

function removePidFile(captureId: string): void {
  const pidPath = getPidPath(captureId)
  if (fs.existsSync(pidPath)) fs.unlinkSync(pidPath)
}

export function registerCaptureCommand(program: Command): void {
  const capture = program
    .command('capture')
    .description('Manage capture sessions')

  capture
    .command('start')
    .description('Start a new capture session')
    .requiredOption('-n, --name <name>', 'Capture name')
    .requiredOption('-s, --service <service>', 'Service name')
    .requiredOption('-t, --target <url>', 'Target URL to proxy')
    .option('-r, --sample-rate <rate>', 'Sample rate (0-1)', String(config.proxy.defaultSampleRate))
    .option('-p, --port <port>', 'Port to listen on', String(config.proxy.listenPort))
    .option('-d, --daemon', 'Run in background (daemon mode)')
    .action(async (opts) => {
      try {
        const cap = createCapture({
          name: opts.name,
          service_name: opts.service,
          target_url: opts.target,
          sample_rate: parseFloat(opts.sampleRate),
        })

        const session: CaptureSession = {
          captureId: cap.id,
          targetUrl: opts.target,
          sampleRate: parseFloat(opts.sampleRate),
          listenPort: parseInt(opts.port, 10),
          maxBodySize: parseBodySize(config.proxy.maxBodySize),
        }

        const server = createProxyServer(session)
        server.onCapture(({ method, url }) => {
          console.log(chalk.gray(`  ${method} ${url}`))
        })

        if (opts.daemon) {
          writePidFile(cap.id)
          console.log(chalk.green('Capture started (daemon mode):'))
          console.log(formatCapture(cap))
          console.log(`\n  ID: ${chalk.cyan(cap.id)}`)
          console.log(`  PID: ${chalk.cyan(String(process.pid))}`)
          console.log(`  Log: ${chalk.cyan(`bottlecap capture inspect ${cap.id}`)}`)

          await server.listen(session.listenPort)

          process.on('SIGTERM', async () => {
            await server.close()
            updateCaptureStatus(cap.id, 'completed')
            removePidFile(cap.id)
            process.exit(0)
          })
          process.on('SIGINT', async () => {
            await server.close()
            updateCaptureStatus(cap.id, 'completed')
            removePidFile(cap.id)
            process.exit(0)
          })
        } else {
          console.log(chalk.green('Capture started:'))
          console.log(formatCapture(cap))
          console.log(`\n  ID: ${chalk.cyan(cap.id)}`)
          console.log(`  Port: ${chalk.cyan(String(session.listenPort))}`)
          console.log(chalk.gray('  Press Ctrl+C to stop'))

          await server.listen(session.listenPort)

          process.on('SIGINT', async () => {
            console.log(chalk.yellow('\nShutting down proxy...'))
            await server.close()
            updateCaptureStatus(cap.id, 'completed')
            console.log(chalk.green('Capture stopped'))
            process.exit(0)
          })
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
          console.error(chalk.red(`Port ${opts.port} is already in use. Try a different port with --port.`))
        } else {
          console.error(chalk.red('Failed to start capture:'), err)
        }
        process.exit(1)
      }
    })

  capture
    .command('stop <id>')
    .description('Stop a capture session')
    .action((id) => {
      const cap = getCapture(id)
      if (!cap) {
        console.error(chalk.red(`Capture not found: ${id}`))
        process.exit(1)
      }
      if (cap.status !== 'active') {
        console.error(chalk.red(`Capture is not active (status: ${cap.status})`))
        process.exit(1)
      }

      const pidPath = getPidPath(id)
      if (fs.existsSync(pidPath)) {
        const pid = parseInt(fs.readFileSync(pidPath, 'utf-8').trim(), 10)
        try {
          process.kill(pid, 'SIGTERM')
          removePidFile(id)
          console.log(chalk.green(`Sent SIGTERM to process ${pid}`))
        } catch {
          console.error(chalk.red(`Failed to signal process ${pid}. It may have already exited.`))
          removePidFile(id)
        }
      } else {
        const updated = updateCaptureStatus(id, 'completed')
        console.log(chalk.green('Capture stopped:'))
        console.log(formatCapture(updated!))
      }
    })

  capture
    .command('list')
    .description('List all capture sessions')
    .option('-l, --limit <n>', 'Max results', '20')
    .action((opts) => {
      const captures = listCaptures({ limit: parseInt(opts.limit, 10) })
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
    })

  capture
    .command('inspect <id>')
    .description('View capture details')
    .action((id) => {
      const cap = getCapture(id)
      if (!cap) {
        console.error(chalk.red(`Capture not found: ${id}`))
        process.exit(1)
      }
      console.log(formatCapture(cap))
    })
}

function parseBodySize(size: string): number {
  const match = size.match(/^(\d+)(mb|kb|b)?$/i)
  if (!match) return 10 * 1024 * 1024
  const value = parseInt(match[1], 10)
  const unit = (match[2] || 'b').toLowerCase()
  if (unit === 'mb') return value * 1024 * 1024
  if (unit === 'kb') return value * 1024
  return value
}
