-- Migration tracking table
-- Tracks which migrations have been applied to prevent re-execution

CREATE TABLE IF NOT EXISTS _schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
