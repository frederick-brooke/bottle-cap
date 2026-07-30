import { Router } from 'express'
import { createReplay, getReplay, listReplays, updateReplayStatus } from '../../storage/repositories/replays'
import { getReplaySummary } from '../../storage/repositories/results'
import { getCapture } from '../../storage/repositories/captures'
import { runReplay } from '../../replay/engine'

export const replaysRouter = Router()

const VALID_MODES = ['paced', 'burst', 'throttled'] as const

replaysRouter.post('/', (req, res) => {
  const { name, captureId, targetUrl, mode, rateLimit: rawRateLimit, rejectUnauthorized } = req.body

  if (!captureId) {
    res.status(400).json({ error: 'captureId is required' })
    return
  }

  if (!targetUrl) {
    res.status(400).json({ error: 'targetUrl is required' })
    return
  }

  if (mode && !VALID_MODES.includes(mode)) {
    res.status(400).json({ error: `mode must be one of: ${VALID_MODES.join(', ')}` })
    return
  }

  const rateLimit = rawRateLimit !== undefined ? Number(rawRateLimit) : undefined
  if (mode === 'throttled' && (rateLimit === undefined || isNaN(rateLimit) || rateLimit < 1 || !Number.isInteger(rateLimit))) {
    res.status(400).json({ error: 'rateLimit must be a positive integer for throttled mode' })
    return
  }

  const capture = getCapture(captureId)
  if (!capture) {
    res.status(404).json({ error: 'Capture not found' })
    return
  }

  const replay = createReplay({
    name: name ?? null,
    capture_id: captureId,
    target_url: targetUrl,
    mode: mode ?? 'paced',
    rate_limit: rateLimit && !isNaN(rateLimit) ? rateLimit : undefined,
    triggered_by: 'api',
  })

  const overrides = rejectUnauthorized !== undefined
    ? { rejectUnauthorized: Boolean(rejectUnauthorized) }
    : undefined

  runReplay(replay.id, undefined, overrides).catch((err) => {
    console.error(`Replay ${replay.id} failed:`, err.message)
    updateReplayStatus(replay.id, 'failed')
  })

  res.status(202).json({ replay })
})

replaysRouter.get('/', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const replays = listReplays({
    limit: isNaN(limit) || limit < 0 ? 50 : limit,
    offset: isNaN(offset) || offset < 0 ? 0 : offset,
  })

  res.json({ replays })
})

replaysRouter.get('/:id', (req, res) => {
  const replay = getReplay(req.params.id)
  if (!replay) {
    res.status(404).json({ error: 'Replay not found' })
    return
  }

  const summary = getReplaySummary(req.params.id)
  res.json({ replay, summary })
})

replaysRouter.post('/:id/cancel', (req, res) => {
  const replay = getReplay(req.params.id)
  if (!replay) {
    res.status(404).json({ error: 'Replay not found' })
    return
  }

  if (replay.status !== 'running' && replay.status !== 'pending') {
    res.status(409).json({ error: `Replay cannot be cancelled (status: ${replay.status})` })
    return
  }

  const updated = updateReplayStatus(replay.id, 'failed')
  res.json({ replay: updated })
})
