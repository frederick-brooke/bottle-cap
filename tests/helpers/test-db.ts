import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const TEST_DB_PATH = path.resolve('./data/test-proxy.db')

export function createTestDb(): Database.Database {
  const dbDir = path.dirname(TEST_DB_PATH)
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

  const db = new Database(TEST_DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const migrationPath = path.resolve('./migrations/001_initial.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')
  db.exec(sql)

  return db
}

export function cleanupTestDb(db: Database.Database): void {
  db.close()
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal')
  if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm')
}

export function clearTestDb(db: Database.Database): void {
  db.exec('DELETE FROM replay_results')
  db.exec('DELETE FROM replays')
  db.exec('DELETE FROM http_requests')
  db.exec('DELETE FROM captures')
}
