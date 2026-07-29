import { Client as MinioClient } from 'minio'
import config from '../../bottlecap.config'

let client: MinioClient | null = null

function getClient(): MinioClient {
  if (!client) {
    client = new MinioClient({
      endPoint: new URL(config.storage.s3.endpoint).hostname,
      port: parseInt(new URL(config.storage.s3.endpoint).port || '9000', 10),
      useSSL: new URL(config.storage.s3.endpoint).protocol === 'https:',
      accessKey: config.storage.s3.accessKey,
      secretKey: config.storage.s3.secretKey,
    })
  }
  return client
}

export async function ensureBucket(): Promise<void> {
  const minio = getClient()
  const exists = await minio.bucketExists(config.storage.s3.bucket)
  if (!exists) {
    await minio.makeBucket(config.storage.s3.bucket)
  }
}

export async function putObject(key: string, body: Buffer | string): Promise<void> {
  const minio = getClient()
  const bodyBuffer = typeof body === 'string' ? Buffer.from(body) : body
  await minio.putObject(config.storage.s3.bucket, key, bodyBuffer, bodyBuffer.length)
}

export async function getObject(key: string): Promise<Buffer> {
  const minio = getClient()
  const stream = await minio.getObject(config.storage.s3.bucket, key)
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function deleteObject(key: string): Promise<void> {
  const minio = getClient()
  await minio.removeObject(config.storage.s3.bucket, key)
}

export async function objectExists(key: string): Promise<boolean> {
  const minio = getClient()
  try {
    await minio.statObject(config.storage.s3.bucket, key)
    return true
  } catch {
    return false
  }
}
