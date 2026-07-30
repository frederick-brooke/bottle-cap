# Bottle Cap - Incident Replay Tool

> Capture production HTTP traffic via proxy, store it, replay against staging to verify fixes before deployment.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Language | TypeScript | Full-stack consistency, fast prototyping |
| Runtime | Node.js | Mature ecosystem, great HTTP libraries |
| CLI | Commander.js | De facto standard for Node CLIs |
| HTTP Capture | http-proxy | Transparent proxy capture |
| API Server | Express | Lightweight, flexible |
| Database | SQLite (better-sqlite3) | Zero-config, embedded, fast |
| Object Store | S3 (MinIO for local) | Scalable body storage |
| Web UI | Next.js | SSR for dashboard, API routes |
| Diff Engine | deep-diff + custom | Structural comparison |

---

## Project Structure

```
projects/bottle-cap/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
│
├── src/
│   ├── cli/                        # CLI entry point
│   │   ├── index.ts                # Main CLI setup
│   │   ├── commands/
│   │   │   ├── capture.ts          # Start/stop capture proxy
│   │   │   ├── replay.ts           # Execute replay
│   │   │   ├── list.ts             # List captures/replays
│   │   │   ├── inspect.ts          # View capture details
│   │   │   └── diff.ts             # Compare results
│   │   └── utils/
│   │       ├── format.ts           # Output formatting
│   │       └── config.ts           # CLI config management
│   │
│   ├── proxy/                      # HTTP Capture Proxy
│   │   ├── server.ts               # Proxy server implementation
│   │   ├── capture.ts              # Request/response capture logic
│   │   ├── middleware/
│   │   │   ├── sanitizer.ts        # PII scrubbing
│   │   │   └── sampler.ts          # Sampling strategies
│   │   └── types.ts                # Proxy type definitions
│   │
│   ├── storage/                    # Data persistence
│   │   ├── database.ts             # SQLite connection & migrations
│   │   ├── repositories/
│   │   │   ├── captures.ts         # Capture CRUD
│   │   │   ├── replays.ts          # Replay CRUD
│   │   │   └── results.ts          # Results CRUD
│   │   └── object-store.ts         # S3/MinIO body storage
│   │
│   ├── replay/                     # Replay engine
│   │   ├── engine.ts               # Core replay logic
│   │   ├── modes/
│   │   │   ├── paced.ts            # Original timing
│   │   │   ├── burst.ts            # As fast as possible
│   │   │   └── throttled.ts        # Rate-limited
│   │   ├── sender.ts               # HTTP request sender
│   │   └── types.ts                # Replay type definitions
│   │
│   ├── diff/                       # Diff engine
│   │   ├── comparator.ts           # Main comparison logic
│   │   ├── body-diff.ts            # JSON body comparison
│   │   ├── latency-diff.ts         # Latency analysis
│   │   └── types.ts                # Diff type definitions
│   │
│   ├── api/                        # REST API
│   │   ├── server.ts               # Express server
│   │   ├── routes/
│   │   │   ├── captures.ts         # Capture endpoints
│   │   │   ├── replays.ts          # Replay endpoints
│   │   │   └── results.ts          # Results endpoints
│   │   └── middleware/
│   │       └── auth.ts             # API key auth
│   │
│   └── web/                        # Next.js Web UI
│       ├── pages/
│       │   ├── index.tsx           # Dashboard
│       │   ├── captures/
│       │   │   └── [id].tsx        # Capture detail
│       │   └── replays/
│       │       └── [id].tsx        # Replay results
│       ├── components/
│       │   ├── CaptureList.tsx
│       │   ├── ReplayResults.tsx
│       │   ├── DiffViewer.tsx
│       │   └── LatencyChart.tsx
│       └── lib/
│           └── api.ts              # API client
│
├── migrations/                     # SQLite migrations
│   ├── 000_migration_tracking.sql  # Migration tracking table
│   ├── 001_initial.sql             # Initial schema
│   └── 002_add_truncation.sql      # Add truncated column
│
└── tests/
    ├── cli/
    │   └── format.test.ts          # CLI formatting tests
    ├── diff/
    │   ├── body-diff.test.ts
    │   ├── latency-diff.test.ts
    │   └── comparator.test.ts
    ├── replay/
    │   ├── sender.test.ts
    │   ├── engine.test.ts
    │   └── modes/
    │       ├── burst.test.ts
    │       ├── pace.test.ts
    │       └── throttle.test.ts
    └── helpers/
        ├── mock-target.ts
        └── test-db.ts
```

---

## Database Schema

```sql
-- migrations/001_initial.sql + 002_add_truncation.sql

CREATE TABLE captures (
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

CREATE TABLE http_requests (
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

CREATE INDEX idx_requests_capture ON http_requests(capture_id, recorded_at);
CREATE INDEX idx_requests_trace ON http_requests(trace_id);

CREATE TABLE replays (
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

CREATE TABLE replay_results (
    id TEXT PRIMARY KEY,
    replay_id TEXT NOT NULL REFERENCES replays(id),
    request_id TEXT NOT NULL REFERENCES http_requests(id),
    original_status INTEGER,
    replayed_status INTEGER,
    original_latency_ms REAL,
    replayed_latency_ms REAL,
    body_diff_summary JSON,
    body_identical BOOLEAN,
    truncated BOOLEAN DEFAULT 0,
    error TEXT,
    replayed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_results_replay ON replay_results(replay_id);

CREATE TABLE _schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE VIEW replay_summary AS
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
```

---

## Implementation Phases

| Phase | Duration | Deliverables | Status |
|-------|----------|--------------|--------|
| **1. Core Infrastructure** | Week 1 | Project setup, DB schema, basic CLI skeleton | ✅ Complete |
| **2. Capture Proxy** | Week 2 | Working proxy that captures traffic to SQLite + S3 | ✅ Complete |
| **3. Replay Engine** | Week 3-4 | Paced replay mode, basic diff comparison | ✅ Complete |
| **4. CLI Polish** | Week 5 | All CLI commands, formatting, progress indicators, replay hardening | ✅ Complete |
| **5. API Layer** | Week 6 | REST API for programmatic access | |
| **6. Web Dashboard** | Week 7-8 | Next.js UI with replay visualization | Partial (debug UI done) |

---

## CLI Commands

```bash
# Capture traffic
bottlecap capture start \
  --name "pre-deploy-capture" \
  --service "my-api" \
  --target https://api.staging.example.com \
  --port 8080 \
  --sample-rate 1.0

# Run capture in background
bottlecap capture start \
  --name "pre-deploy-capture" \
  --service "my-api" \
  --target https://api.staging.example.com \
  --daemon

# List captures
bottlecap capture list
bottlecap capture list --json

# View capture details
bottlecap capture inspect <id>

# Stop a capture
bottlecap capture stop <id>

# Execute replay (with colored output)
bottlecap replay run \
  --capture "pre-deploy-capture" \
  --target https://api.staging-fixed.example.com \
  --mode burst

# Execute replay with JSON output
bottlecap replay run \
  --capture "pre-deploy-capture" \
  --target https://api.staging-fixed.example.com \
  --mode burst \
  --json

# Skip TLS verification for self-signed certs
bottlecap replay run \
  --capture "pre-deploy-capture" \
  --target https://staging.local:8443 \
  --no-reject-unauthorized

# View replay results
bottlecap replay results <replay-id>
bottlecap replay results <replay-id> --json

# Compare original vs replayed
bottlecap diff <replay-id>
bottlecap diff <replay-id> --json

# List replays
bottlecap replay list
bottlecap list --type replays
```

---

## API Endpoints

```
POST   /api/captures              # Create capture session
GET    /api/captures              # List captures
GET    /api/captures/:id          # Get capture details
DELETE /api/captures/:id          # Stop/delete capture

POST   /api/replays               # Create replay job
GET    /api/replays               # List replays
GET    /api/replays/:id           # Get replay status
GET    /api/replays/:id/results   # Get diff results
POST   /api/replays/:id/cancel    # Cancel running replay

GET    /api/stats/:captureId      # Capture statistics
```

---

## Configuration

```typescript
// bottlecap.config.ts
export default {
  storage: {
    database: './data/bottlecap.db',
    s3: {
      endpoint: 'http://localhost:9000',
      bucket: 'bottlecap',
      accessKey: 'minioadmin',
      secretKey: 'minioadmin'
    }
  },
  proxy: {
    defaultSampleRate: 1.0,
    maxBodySize: '10mb',
    listenPort: 8080,
    daemonPidDir: './data'
  },
  replay: {
    defaultTimeout: 30000,
    maxConcurrent: 10,
    rejectUnauthorized: true
  },
  api: {
    port: 3001,
    apiKey: process.env.BOTTLECAP_API_KEY
  }
}
```

---

## Dependencies

```json
{
  "dependencies": {
    "commander": "^11.0.0",
    "better-sqlite3": "^9.4.0",
    "http-proxy": "^1.18.0",
    "express": "^4.18.0",
    "minio": "^7.0.0",
    "deep-diff": "^1.0.2",
    "chalk": "^4.1.2",
    "ora": "^7.0.0",
    "inquirer": "^9.2.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/http-proxy": "^1.17.0",
    "@types/express": "^4.17.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0",
    "tsx": "^4.7.0"
  }
}
```

---

## Phase 4: CLI Polish + Replay Hardening ✅ Complete

### Deliverables
- All CLI commands fully polished with formatting and progress indicators
- Replay engine hardening from Phase 3 code review
- Migration tracking system
- JSON output support for all commands

### Bugs Fixed (from Phase 3 code review)

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | HIGH | TLS `rejectUnauthorized: false` hardcoded | Added `replay.rejectUnauthorized` config option (default `true`) + `--no-reject-unauthorized` CLI flag |
| 2 | HIGH | `--daemon` mode exits immediately | Root cause: `program.parse()` discards async promise. Fixed to `program.parseAsync()` + never-resolving keep-alive promise + stale PID detection |
| 3 | MEDIUM | Silent 1MB response truncation | Added `truncated` boolean to `SendResult` and `replay_results` table (new migration `002_add_truncation.sql`) |
| 4 | MEDIUM | `computeDiff` stack overflow on deep JSON | Added `maxDepth` parameter (default 64), stops recursing with structural comparison at limit |
| 5 | LOW | `percentageChange` NaN on corrupt data | Added `Number.isNaN()` and `Number.isFinite()` guards in `analyzeLatency` |

### Additional Fixes

| Issue | Fix |
|-------|-----|
| SQLite boolean conversion (0/1 vs true/false) | Changed `mapRowToResult` to explicitly convert integers to booleans |
| Null status rendering (literal `null` in output) | Renders `???` for null statuses, proper null-safe comparison |
| CWD-dependent migrations path | Changed to `path.resolve(__dirname, '../../migrations')` |
| `loadRequests` JSON parse crash | Added `safeJsonParse` helper with try/catch |
| `--port` and `--sample-rate` NaN propagation | Added input validation with descriptive error messages |
| Burst/throttle send() rejection silently dropped | Now records error result instead of silently skipping |
| Daemon SIGTERM doesn't close DB | Added `closeDatabase()` to signal handlers |

### New Features

| Feature | Details |
|---------|---------|
| Migration tracking | `_schema_migrations` table tracks applied migrations, prevents re-execution |
| Colored mode names | `paced` (cyan), `burst` (magenta), `throttled` (yellow) |
| Status badges | `✓ completed`, `● running`, `✗ failed`, `○ pending`, `◌ paused` |
| Pass rate bar | Visual progress bar in replay summary (`████████░░ 80.0%`) |
| `--json` output flag | Available on all commands for machine-readable output |
| Stale PID detection | `capture stop` checks if process is alive before signaling |

### Tests
- **151 unit tests passing** (up from 107 in Phase 3)
- **77 E2E validations passing**
- **Lint clean**

---

## Future Optimizations (Deferred)

| Area | Issue | Notes |
|------|-------|-------|
| Performance | `shouldStop()` caching | In paced mode with large captures (10K+ requests), `shouldStop()` reads the SQLite DB on every call (before each request and during 100ms sleep chunks). Could be optimized by caching the replay status locally and refreshing periodically (e.g., every 5 seconds or every 100 requests). Deferred from Phase 4 — better-sqlite3 reads are ~microseconds so the overhead is acceptable for now. |

---

## Monetization Strategy

| Tier | Price | Features |
|------|-------|----------|
| **Starter** | $0/mo | 100 captures/day, 7-day retention, 1 replay/day |
| **Pro** | $49/mo | 10k captures/day, 30-day retention, unlimited replays, CLI |
| **Enterprise** | $499/mo | Custom retention, SSO, audit logs, on-prem option |

**Unit Economics**:
- Storage: ~$0.10/GB/month (ClickHouse + S3 mix)
- Avg capture: ~10KB -> 1M captures = ~10GB = ~$1/month storage
- Target margin: 70%+ on storage costs
