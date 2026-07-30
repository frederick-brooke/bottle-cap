import type { HttpRequest } from '@/types'
import type { ReplayMode, ReplayOptions, SendResult } from '../types'

const MAX_DELAY_MS = 30_000
const SLEEP_GRANULARITY_MS = 100

export const pacedMode: ReplayMode = {
  name: 'paced',

  async execute(
    requests: HttpRequest[],
    send: (req: HttpRequest) => Promise<SendResult>,
    _options: ReplayOptions,
    onResult: (result: SendResult) => void,
    shouldStop: () => boolean,
  ): Promise<void> {
    if (requests.length === 0) return

    const sorted = [...requests].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
    )

    for (let i = 0; i < sorted.length; i++) {
      if (shouldStop()) return

      if (i > 0) {
        const prevTime = new Date(sorted[i - 1].recorded_at).getTime()
        const currTime = new Date(sorted[i].recorded_at).getTime()
        let remaining = Math.min(currTime - prevTime, MAX_DELAY_MS)

        while (remaining > 0) {
          const stop = shouldStop()
          if (stop) return
          const sleepMs = Math.min(remaining, SLEEP_GRANULARITY_MS)
          await new Promise<void>((r) => setTimeout(r, sleepMs))
          remaining -= sleepMs
        }
      }

      if (shouldStop()) return

      const result = await send(sorted[i])
      onResult(result)
    }
  },
}
