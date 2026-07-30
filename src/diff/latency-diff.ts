import type { LatencyAnalysis } from './types'

export function analyzeLatency(
  originalMs: number | null,
  replayedMs: number | null,
): LatencyAnalysis | null {
  if (originalMs === null || replayedMs === null) return null
  if (Number.isNaN(originalMs) || Number.isNaN(replayedMs)) return null
  if (!Number.isFinite(originalMs) || !Number.isFinite(replayedMs)) return null

  const deltaMs = replayedMs - originalMs
  const percentageChange = originalMs === 0
    ? (replayedMs === 0 ? 0 : 100)
    : (deltaMs / originalMs) * 100

  return {
    originalMs,
    replayedMs,
    deltaMs,
    percentageChange: Math.round(percentageChange * 100) / 100,
  }
}
