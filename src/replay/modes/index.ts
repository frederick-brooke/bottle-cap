import type { ReplayMode } from '../types'
import { pacedMode } from './pace'
import { burstMode } from './burst'
import { throttledMode } from './throttle'

const modes: Record<string, ReplayMode> = {
  paced: pacedMode,
  burst: burstMode,
  throttled: throttledMode,
}

export function createMode(mode: string): ReplayMode {
  const m = modes[mode]
  if (!m) {
    throw new Error(`Unknown replay mode: ${mode}. Valid modes: ${Object.keys(modes).join(', ')}`)
  }
  return m
}

export { pacedMode } from './pace'
export { burstMode } from './burst'
export { throttledMode } from './throttle'
