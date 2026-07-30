import express from 'express'
import { authMiddleware } from './middleware/auth'
import { capturesRouter } from './routes/captures'
import { replaysRouter } from './routes/replays'
import { resultsRouter } from './routes/results'
import { statsRouter } from './routes/stats'

export function createApp(): express.Express {
  const app = express()
  app.use(express.json())
  app.use('/api', authMiddleware)
  app.use('/api/captures', capturesRouter)
  app.use('/api/replays', replaysRouter)
  app.use('/api/results', resultsRouter)
  app.use('/api/stats', statsRouter)

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use((err: { status?: number; message?: string }, _req: express.Request, res: express.Response) => {
    const status = err.status || 500
    const message = status === 500 ? 'Internal server error' : (err.message || 'Error')
    console.error('API error:', err.message)
    res.status(status).json({ error: message })
  })

  return app
}

/* istanbul ignore next */
async function main() {
  const { getDatabase, closeDatabase } = await import('../storage/database')
  const config = (await import('../../bottlecap.config')).default
  getDatabase()
  const app = createApp()
  const server = app.listen(config.api.port, () => {
    console.log(`Bottle-Cap API listening on port ${config.api.port}`)
  })

  const shutdown = () => {
    console.log('Shutting down...')
    server.close(() => {
      closeDatabase()
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main()
