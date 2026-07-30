import type { HttpRequest } from '@/types'
import type { ReplayMode, ReplayOptions, SendResult } from '../types'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const throttledMode: ReplayMode = {
  name: 'throttled',

  async execute(
    requests: HttpRequest[],
    send: (req: HttpRequest) => Promise<SendResult>,
    options: ReplayOptions,
    onResult: (result: SendResult) => void,
    shouldStop: () => boolean,
  ): Promise<void> {
    if (requests.length === 0) return

    const rate = Math.max(options.rateLimit ?? 10, 1)
    const intervalMs = 1000 / rate
    let running = 0
    let index = 0
    let resolved = false
    let resolveAll: () => void
    const allDone = new Promise<void>((r) => { resolveAll = r })

    const settle = () => {
      if (!resolved && running === 0 && (index >= requests.length || shouldStop())) {
        resolved = true
        resolveAll()
      }
    }

    const runNext = () => {
      if (shouldStop()) {
        settle()
        return
      }

      while (index < requests.length && running < options.maxConcurrent) {
        if (shouldStop()) break

        const request = requests[index++]
        running++

        sleep(intervalMs).then(() => {
          if (shouldStop()) {
            running--
            settle()
            return
          }
          send(request).then(
            (result) => {
              onResult(result)
              running--
              runNext()
            },
            () => {
              running--
              runNext()
            },
          )
        })
      }

      settle()
    }

    runNext()
    await allDone
  },
}
