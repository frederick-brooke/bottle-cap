import { Router } from 'express'
import { getResultsByReplay, getReplaySummary } from '../../storage/repositories/results'
import { getReplay } from '../../storage/repositories/replays'

export const resultsRouter = Router()

resultsRouter.get('/:replayId', (req, res) => {
  const replay = getReplay(req.params.replayId)
  if (!replay) {
    res.status(404).json({ error: 'Replay not found' })
    return
  }

  const results = getResultsByReplay(req.params.replayId)
  const summary = getReplaySummary(req.params.replayId)

  res.json({ results, summary })
})
