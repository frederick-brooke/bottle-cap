import { Router } from 'express'
import { createCapture, getCapture, listCaptures, updateCaptureStatus, deleteCapture } from '../../storage/repositories/captures'
import { startCaptureProxy, stopCaptureProxy, getActiveProxies } from '../../proxy/manager'
import config from '../../../bottlecap.config'

export const capturesRouter = Router()

capturesRouter.post('/', async (req, res) => {
  const { name, serviceName, targetUrl, sampleRate: rawSampleRate, port: rawPort } = req.body

  if (!serviceName) {
    res.status(400).json({ error: 'serviceName is required' })
    return
  }

  if (!targetUrl) {
    res.status(400).json({ error: 'targetUrl is required' })
    return
  }

  const sampleRate = rawSampleRate !== undefined ? Number(rawSampleRate) : undefined
  if (sampleRate !== undefined) {
    if (isNaN(sampleRate) || sampleRate < 0 || sampleRate > 1) {
      res.status(400).json({ error: 'sampleRate must be a number between 0 and 1' })
      return
    }
  }

  const port = rawPort !== undefined ? Number(rawPort) : undefined
  if (port !== undefined) {
    if (isNaN(port) || port < 0 || port > 65535) {
      res.status(400).json({ error: 'port must be a number between 0 and 65535' })
      return
    }
  }

  let capture
  try {
    capture = createCapture({
      name: name ?? null,
      service_name: serviceName,
      target_url: targetUrl,
      sample_rate: sampleRate ?? 1.0,
    })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
    return
  }

  try {
    const listenPort = port ?? config.proxy.listenPort
    const actualPort = await startCaptureProxy(
      capture.id,
      targetUrl,
      sampleRate ?? 1.0,
      listenPort
    )
    res.status(201).json({ capture, proxyPort: actualPort })
  } catch (err) {
    deleteCapture(capture.id)
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      res.status(409).json({ error: `Port ${port} is already in use` })
    } else {
      console.error('Failed to start capture proxy:', (err as Error).message)
      res.status(500).json({ error: (err as Error).message })
    }
  }
})

capturesRouter.get('/', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const captures = listCaptures({
    limit: isNaN(limit) || limit < 0 ? 50 : limit,
    offset: isNaN(offset) || offset < 0 ? 0 : offset,
  })

  const active = getActiveProxies()
  const enriched = captures.map(c => ({
    ...c,
    isActive: active.has(c.id),
    proxyPort: active.get(c.id)?.port ?? null,
  }))

  res.json({ captures: enriched })
})

capturesRouter.get('/:id', (req, res) => {
  const capture = getCapture(req.params.id)
  if (!capture) {
    res.status(404).json({ error: 'Capture not found' })
    return
  }
  const active = getActiveProxies()
  res.json({
    capture: {
      ...capture,
      isActive: active.has(capture.id),
      proxyPort: active.get(capture.id)?.port ?? null,
    },
  })
})

capturesRouter.delete('/:id', async (req, res) => {
  const capture = getCapture(req.params.id)
  if (!capture) {
    res.status(404).json({ error: 'Capture not found' })
    return
  }

  if (capture.status !== 'active') {
    res.status(409).json({ error: `Capture is not active (status: ${capture.status})` })
    return
  }

  try {
    await stopCaptureProxy(capture.id)
  } catch (err) {
    console.error('Failed to stop capture proxy:', (err as Error).message)
  }

  const updated = updateCaptureStatus(capture.id, 'completed')
  res.json({ capture: updated })
})
