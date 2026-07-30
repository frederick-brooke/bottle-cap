import { Router } from 'express'
import { getCapture } from '../../storage/repositories/captures'
import { getDatabase } from '../../storage/database'
import { listReplaysByCapture } from '../../storage/repositories/replays'
import { getReplaySummariesByReplayIds } from '../../storage/repositories/results'

export const statsRouter = Router()

statsRouter.get('/:captureId', (req, res) => {
  const capture = getCapture(req.params.captureId)
  if (!capture) {
    res.status(404).json({ error: 'Capture not found' })
    return
  }

  const db = getDatabase()
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM http_requests WHERE capture_id = ?'
  ).get(req.params.captureId) as { count: number }

  const replays = listReplaysByCapture(req.params.captureId)
  const replayIds = replays.map(r => r.id)
  const summaries = getReplaySummariesByReplayIds(replayIds)

  res.json({
    capture,
    requestCount: row.count,
    replays: replays.map(r => ({
      ...r,
      summary: summaries.get(r.id) ?? null,
    })),
  })
})
