import type { HttpRequest } from '@/types'
import type { ReplayMode, ReplayOptions, SendResult } from '../types'

export const burstMode: ReplayMode = {
  name: 'burst',

  async execute(
    requests: HttpRequest[],
    send: (req: HttpRequest) => Promise<SendResult>,
    options: ReplayOptions,
    onResult: (result: SendResult) => void,
    shouldStop: () => boolean,
  ): Promise<void> {
    if (requests.length === 0) return

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
      }

      settle()
    }

    runNext()
    await allDone
  },
}
