export interface DiffResult {
  bodyIdentical: boolean
  bodyDiffSummary: DiffSummary
  latencyDeltaMs: number | null
}

export interface DiffSummary {
  added: number
  removed: number
  changed: number
  details: DiffDetail[]
}

export interface DiffDetail {
  path: string
  kind: 'added' | 'removed' | 'edited'
  lhs?: unknown
  rhs?: unknown
}

export interface LatencyAnalysis {
  originalMs: number
  replayedMs: number
  deltaMs: number
  percentageChange: number
}
