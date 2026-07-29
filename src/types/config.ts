export interface Config {
  storage: {
    database: string
    s3: {
      endpoint: string
      bucket: string
      accessKey: string
      secretKey: string
    }
  }
  proxy: {
    defaultSampleRate: number
    maxBodySize: string
    listenPort: number
    daemonPidDir: string
  }
  replay: {
    defaultTimeout: number
    maxConcurrent: number
  }
  api: {
    port: number
    apiKey?: string
  }
}
