import type { DiffResult } from './types'
import { diffBody } from './body-diff'
import { analyzeLatency } from './latency-diff'

export function compareResponses(params: {
  originalBody: string | null
  replayedBody: string | null
  originalLatencyMs: number | null
  replayedLatencyMs: number | null
}): DiffResult {
  const bodyDiffSummary = diffBody(params.originalBody, params.replayedBody)
  const latencyAnalysis = analyzeLatency(params.originalLatencyMs, params.replayedLatencyMs)

  return {
    bodyIdentical: bodyDiffSummary.added === 0 && bodyDiffSummary.removed === 0 && bodyDiffSummary.changed === 0,
    bodyDiffSummary,
    latencyDeltaMs: latencyAnalysis?.deltaMs ?? null,
  }
}
