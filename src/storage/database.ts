import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import config from '../../bottlecap.config'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.resolve(config.storage.database)
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='captures'"
    ).all()
    if (tables.length === 0) {
      runMigrations()
    }
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function runMigrations(): void {
  const database = getDatabase()
  const migrationsDir = path.resolve('migrations')

  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found:', migrationsDir)
    process.exit(1)
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filePath, 'utf-8')
    console.log(`Running migration: ${file}`)
    database.exec(sql)
  }

  console.log(`Completed ${migrationFiles.length} migration(s)`)
}

export function runCliMigrations(): void {
  runMigrations()
  closeDatabase()
}
