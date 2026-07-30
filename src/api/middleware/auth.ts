import type { Request, Response, NextFunction } from 'express'
import config from '../../../bottlecap.config'
import crypto from 'crypto'

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = config.api.apiKey
  if (!apiKey) {
    next()
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  const keyBuffer = Buffer.from(apiKey)
  const tokenBuffer = Buffer.from(token)

  if (keyBuffer.length !== tokenBuffer.length || !crypto.timingSafeEqual(keyBuffer, tokenBuffer)) {
    res.status(401).json({ error: 'Invalid API key' })
    return
  }

  next()
}
