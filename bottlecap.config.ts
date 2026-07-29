import type { Config } from './src/types/config'

const config: Config = {
  storage: {
    database: './data/bottlecap.db',
    s3: {
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      bucket: process.env.S3_BUCKET || 'bottlecap',
      accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    },
  },
  proxy: {
    defaultSampleRate: parseFloat(process.env.PROXY_DEFAULT_SAMPLE_RATE || '1.0'),
    maxBodySize: process.env.PROXY_MAX_BODY_SIZE || '10mb',
    listenPort: parseInt(process.env.PROXY_LISTEN_PORT || '8080', 10),
    daemonPidDir: process.env.PROXY_DAEMON_PID_DIR || './data',
  },
  replay: {
    defaultTimeout: 30000,
    maxConcurrent: 10,
  },
  api: {
    port: parseInt(process.env.API_PORT || '3001', 10),
    apiKey: process.env.BOTTLECAP_API_KEY,
  },
}

export default config
