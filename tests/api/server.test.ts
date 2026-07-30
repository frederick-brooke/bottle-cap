import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/api/server'
import { runMigrations, closeDatabase } from '../../src/storage/database'

let app: ReturnType<typeof createApp>

beforeAll(() => {
  runMigrations()
  app = createApp()
})

afterAll(() => {
  closeDatabase()
})

describe('server lifecycle', () => {
  it('creates an Express app', () => {
    expect(app).toBeDefined()
    expect(typeof app.listen).toBe('function')
  })

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown')
    expect(res.status).toBe(404)
  })

  it('handles JSON content type', async () => {
    const res = await request(app)
      .post('/api/captures')
      .set('Content-Type', 'application/json')
      .send('{}')
    expect(res.status).toBe(400)
  })

  it('returns proper error format on validation failure', async () => {
    const res = await request(app)
      .post('/api/captures')
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
    expect(typeof res.body.error).toBe('string')
  })
})
