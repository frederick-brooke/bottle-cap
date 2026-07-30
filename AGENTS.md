<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:bottle-cap-agent-rules -->
# Bottle-Cap Agent Rules

## Project Overview
Bottle-Cap is an incident replay tool. It captures production HTTP traffic via a proxy, stores it, and replays it against staging environments to verify fixes before deployment.

## Implementation Status
- **Phase 1 ✅** — Core infrastructure (DB, types, CLI skeleton, storage repos)
- **Phase 2 ✅** — Capture proxy (http-proxy, sanitization, sampling, S3/SQLite fallback)
- **Phase 3 ✅** — Replay engine (paced/burst/throttled modes, diff engine, CLI integration)
- **Phase 4 ✅** — CLI polish + replay hardening (colored output, --json flag, migration tracking, bug fixes)
- **Phase 5 ✅** — API layer (Express REST API, auth, 10 endpoints, supertest tests)
- **Phase 6 ✅** — Web dashboard (Next.js UI, replay execution, diff viewer, latency charts, docs)

## Architecture
- **CLI** (`src/cli/`): Commander.js-based CLI for capture, replay, diff commands
  - `index.ts`: Entry point with `parseAsync()` for proper async handling
  - `commands/capture.ts`: Start/stop/list/inspect captures (supports daemon mode)
  - `commands/replay.ts`: Run/list/results/cancel replays (supports --json, --no-reject-unauthorized)
  - `commands/diff.ts`: Compare original vs replayed responses
  - `commands/list.ts`: List captures or replays
  - `utils/format.ts`: Colored output, status badges, pass rate bars, JSON formatting
- **Proxy** (`src/proxy/`): HTTP proxy that intercepts and records traffic
- **Storage** (`src/storage/`): SQLite database + S3/MinIO object storage
  - `database.ts`: Connection management, migration tracking with `_schema_migrations` table
  - `repositories/results.ts`: Result CRUD with proper boolean conversion from SQLite
- **Replay** (`src/replay/`): Engine to replay captured requests (paced, burst, throttled)
  - `sender.ts`: HTTP request sender with URL rewriting, body retrieval, timeout handling, truncation detection
  - `engine.ts`: Orchestrator — loads requests from DB, executes mode, records diff results, safe JSON parsing
  - `modes/`: Paced (original timing), burst (max concurrency), throttled (rate-limited)
    - All modes handle `onResult` errors gracefully without losing requests
    - Burst/throttle record error results on `send()` rejection
- **Diff** (`src/diff/`): Compare original vs replayed responses
  - `body-diff.ts`: Recursive JSON body comparison with `maxDepth` limit (default 64)
  - `latency-diff.ts`: Latency delta and percentage analysis with NaN/Infinity guards
  - `comparator.ts`: Orchestrates body + latency comparison
- **API** (`src/api/`): Express 5 REST API for programmatic access
  - `server.ts`: App factory + dev server entry point (`npm run dev:api`)
  - `middleware/auth.ts`: API key auth with timing-safe comparison (optional via `BOTTLECAP_API_KEY`)
  - `routes/captures.ts`: Create (with proxy start), list, get, stop
  - `routes/replays.ts`: Create (fire-and-forget 202), list, get, cancel
  - `routes/results.ts`: Get replay results + summary
  - `routes/stats.ts`: Capture statistics with batch query optimization
- **Web UI** (`src/web/`): Reusable React components (StatusBadge, CaptureCard, ReplayCard, ReplayForm, ResultsTable, DiffViewer, LatencyChart, etc.)
- **Dashboard** (`src/app/`): Next.js App Router pages
  - `/`: Dashboard home with stats, recent captures/replays
  - `/capture`: Capture console (start/stop captures, send test requests)
  - `/captures/[id]`: Capture detail with request list and replay history
  - `/replays`: Replay list with pagination
  - `/replays/new`: Create replay form (supports capture preselection via query param)
  - `/replays/[id]`: Replay detail with progress animation, results table, diff viewer, latency chart
  - `/docs/cli`: CLI reference documentation
  - `/docs/api`: API reference documentation
- **Dashboard API** (`src/app/api/dashboard/`): Next.js API routes for the dashboard
  - `stats/route.ts`: Overview statistics
  - `captures/route.ts`: List captures with enrichment
  - `captures/[id]/route.ts`: Capture detail + requests + replays
  - `replays/route.ts`: List/create replays (auto-executes on create)
  - `replays/[id]/route.ts`: Replay detail with summary
  - `replays/[id]/results/route.ts`: Replay results
  - `replays/[id]/cancel/route.ts`: Cancel running replay
  - `requests/[id]/route.ts`: Request detail with body retrieval
  - `stats/[captureId]/route.ts`: Capture-level stats

## Key Conventions
- Use `tsx` to run TypeScript files directly (CLI, API server)
- Database is SQLite via `better-sqlite3` (synchronous API)
- Auto-runs migrations on first `getDatabase()` call via tracking table
- Object bodies stored in S3/MinIO, referenced by key in SQLite (falls back to inline)
- All IDs are UUIDs (use `uuid` package)
- Configuration lives in `bottlecap.config.ts`
- Environment variables in `.env` (see `.env.example`)
- Tests run serially (`fileParallelism: false`) due to shared SQLite singleton
- CLI uses `parseAsync()` (not `parse()`) for proper async action handling
- Dashboard uses Next.js API routes (not Express) to call storage repositories directly
- `captureApi` (not `debugApi`) is the client-side API for capture operations

## Commands
```bash
npm run cli -- <command>     # Run CLI commands
npm run dev                  # Start Next.js dev server (dashboard + capture console)
npm run dev:api              # Start Express API server (port 3001)
npm test                     # Run Vitest tests
npm run test:run             # Run tests once (CI mode)
npm run lint                 # ESLint
```

## Database
- Migrations: `migrations/000_migration_tracking.sql`, `001_initial.sql`, `002_add_truncation.sql`
- Tables: `captures`, `http_requests`, `replays`, `replay_results` (with `truncated` column)
- Tracking: `_schema_migrations` table tracks applied migrations
- View: `replay_summary` for aggregated results
- Auto-migrates on first connection via `getDatabase()`
- DB path: `./data/bottlecap.db` (configurable via `BOTTLECAP_DB_PATH` env var)

## Proxy
- Runs in-process via `src/proxy/manager.ts` (for capture console) or directly via `src/proxy/server.ts` (for CLI)
- Sanitizes headers: Authorization, Cookie, Set-Cookie, Proxy-Authorization, X-Api-Key
- Extracts trace_id from: X-Request-ID, X-Trace-ID, traceparent
- Extracts service_version from: X-Service-Version, X-App-Version, X-Version
- S3 body storage with inline SQLite fallback when S3 unavailable

## Replay Engine
- **Modes**: paced (original timing), burst (max concurrency), throttled (rate-limited)
- **Cancellation**: Via `shouldStop()` callback — checks DB status every iteration
- **Error handling**: `onResult` wrapped in try/catch; `send()` rejection records error result
- **Truncation**: Responses >1MB flagged with `truncated: true` in results
- **Config**: `rejectUnauthorized` controls TLS verification (default: true)
- **Dashboard execution**: Replays auto-execute when created from the dashboard (fire-and-forget via `runReplay()`)

## Diff Engine
- **Body diff**: Recursive JSON comparison with `maxDepth` (default 64) to prevent stack overflow
- **Latency diff**: Delta and percentage analysis with NaN/Infinity guards
- **Null handling**: Null bodies/latencies handled gracefully

## CLI Features
- **Colored output**: Mode names (cyan/magenta/yellow), status badges, pass rate bars
- **`--json` flag**: Available on all commands for machine-readable output
- **Input validation**: `--port` and `--sample-rate` validated before use
- **Daemon mode**: Background capture with PID file management and stale PID detection

## Dashboard Features
- **Dashboard home**: Overview stats, recent captures with Replay button, recent replays with Re-run button
- **Capture console**: Start/stop captures, send test requests, view captured traffic live
- **Capture detail**: Request list, replay history, link to create replay
- **Replay list**: Paginated list with status, mode, pass rate, running indicator
- **Replay creation**: Form with capture preselection (via `?capture=<id>` query param), mode selection
- **Replay detail**: Progress animation (pulsing dot + progress bar), summary cards, latency chart, results table, diff viewer
- **Diff viewer**: JSON diff with side-by-side view, addition/removal highlighting
- **Latency chart**: Bar chart comparing original vs replayed latency with tooltips
- **Docs pages**: CLI reference and API reference with endpoint documentation
- **Re-run flow**: Replay button on CaptureCard → pre-fills capture on `/replays/new`; Re-run button on ReplayCard → same
<!-- END:bottle-cap-agent-rules -->
