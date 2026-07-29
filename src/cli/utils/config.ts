import path from 'path'
import fs from 'fs'

export interface CliConfig {
  dataDir: string
  configFile: string
}

export function resolveConfig(): CliConfig {
  const dataDir = process.env.BOTTLECAP_DATA_DIR || path.resolve('./data')
  const configFile = process.env.BOTTLECAP_CONFIG || path.resolve('./bottlecap.config.ts')

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  return { dataDir, configFile }
}
