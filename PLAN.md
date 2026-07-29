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
│   └── 001_initial.sql
│
└── tests/
    ├── proxy/
    ├── replay/
    └── diff/
```

---

## Database Schema

```sql
-- migrations/001_initial.sql

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
    error TEXT,
    replayed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_results_replay ON replay_results(replay_id);

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

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **1. Core Infrastructure** | Week 1 | Project setup, DB schema, basic CLI skeleton |
| **2. Capture Proxy** | Week 2 | Working proxy that captures traffic to SQLite + S3 |
| **3. Replay Engine** | Week 3-4 | Paced replay mode, basic diff comparison |
| **4. CLI Polish** | Week 5 | All CLI commands, formatting, progress indicators |
| **5. API Layer** | Week 6 | REST API for programmatic access |
| **6. Web Dashboard** | Week 7-8 | Next.js UI with replay visualization |

---

## CLI Commands

```bash
# Capture traffic
bottlecap capture start \
  --name "pre-deploy-capture" \
  --target https://api.staging.example.com \
  --listen 8080 \
  --sample-rate 1.0

# List captures
bottlecap capture list

# Execute replay
bottlecap replay run \
  --capture "pre-deploy-capture" \
  --target https://api.staging-fixed.example.com \
  --mode paced

# View results
bottlecap replay results <replay-id>

# Compare two replays
bottlecap diff <replay-id-1> <replay-id-2>
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
    maxBodySize: '10mb'
  },
  replay: {
    defaultTimeout: 30000,
    maxConcurrent: 10
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
