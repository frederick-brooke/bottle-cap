-- Bottle Cap - Initial Schema

CREATE TABLE IF NOT EXISTS captures (
    id TEXT PRIMARY KEY,
    name TEXT,
    status TEXT CHECK(status IN ('active', 'paused', 'completed')) DEFAULT 'active',
    service_name TEXT NOT NULL,
    target_url TEXT NOT NULL,
    sample_rate REAL DEFAULT 1.0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    stopped_at DATETIME,
    request_count INTEGER DEFAULT 0,
    config JSON
);

CREATE TABLE IF NOT EXISTS http_requests (
    id TEXT PRIMARY KEY,
    capture_id TEXT NOT NULL REFERENCES captures(id),
    trace_id TEXT,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    headers JSON,
    request_body_key TEXT,
    request_body_preview TEXT,
    status_code INTEGER,
    response_headers JSON,
    response_body_key TEXT,
    response_body_preview TEXT,
    latency_ms REAL,
    service_version TEXT,
    recorded_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requests_capture ON http_requests(capture_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_requests_trace ON http_requests(trace_id);

CREATE TABLE IF NOT EXISTS replays (
    id TEXT PRIMARY KEY,
    name TEXT,
    capture_id TEXT NOT NULL REFERENCES captures(id),
    status TEXT CHECK(status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
    target_url TEXT NOT NULL,
    mode TEXT CHECK(mode IN ('paced', 'burst', 'throttled')) DEFAULT 'paced',
    rate_limit INTEGER,
    config JSON,
    started_at DATETIME,
    completed_at DATETIME,
    total_requests INTEGER DEFAULT 0,
    completed_requests INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    triggered_by TEXT
);

CREATE TABLE IF NOT EXISTS replay_results (
    id TEXT PRIMARY KEY,
    replay_id TEXT NOT NULL REFERENCES replays(id),
    request_id TEXT NOT NULL REFERENCES http_requests(id),
    original_status INTEGER,
    replayed_status INTEGER,
    original_latency_ms REAL,
    replayed_latency_ms REAL,
    body_diff_summary JSON,
    body_identical BOOLEAN,
    error TEXT,
    replayed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_results_replay ON replay_results(replay_id);

CREATE VIEW IF NOT EXISTS replay_summary AS
SELECT
    r.id as replay_id,
    r.name,
    r.status,
    r.mode,
    COUNT(rr.id) as total,
    SUM(CASE WHEN rr.body_identical AND rr.original_status = rr.replayed_status THEN 1 ELSE 0 END) as identical,
    SUM(CASE WHEN rr.original_status != rr.replayed_status THEN 1 ELSE 0 END) as status_changed,
    SUM(CASE WHEN rr.error IS NOT NULL THEN 1 ELSE 0 END) as errors,
    AVG(rr.replayed_latency_ms - rr.original_latency_ms) as avg_latency_delta_ms
FROM replays r
LEFT JOIN replay_results rr ON rr.replay_id = r.id
GROUP BY r.id;
