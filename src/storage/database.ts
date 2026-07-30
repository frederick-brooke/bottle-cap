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

    runMigrations()
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
  const migrationsDir = path.resolve(__dirname, '../../migrations')

  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found:', migrationsDir)
    process.exit(1)
  }

  // Ensure tracking table exists
  database.exec(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const applied = new Set(
    database.prepare('SELECT filename FROM _schema_migrations')
      .all()
      .map((row: Record<string, unknown>) => row.filename as string),
  )

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  const insertMigration = database.prepare(
    'INSERT INTO _schema_migrations (filename) VALUES (?)',
  )

  let appliedCount = 0
  for (const file of migrationFiles) {
    if (applied.has(file)) {
      continue
    }
    const filePath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filePath, 'utf-8')
    console.log(`Running migration: ${file}`)

    database.transaction(() => {
      database.exec(sql)
      insertMigration.run(file)
    })()
    appliedCount++
  }

  console.log(`Completed ${appliedCount} migration(s)`)
}

export function runCliMigrations(): void {
  runMigrations()
  closeDatabase()
}
