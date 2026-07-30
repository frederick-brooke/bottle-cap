import type { LatencyAnalysis } from './types'

export function analyzeLatency(
  originalMs: number | null,
  replayedMs: number | null,
): LatencyAnalysis | null {
  if (originalMs === null || replayedMs === null) return null

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
