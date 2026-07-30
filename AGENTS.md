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
- **Phase 5** — API layer (not started)
- **Phase 6** — Web dashboard (debug UI done, full dashboard not started)

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
- **API** (`src/api/`): Express REST API for programmatic access
- **Web UI** (`src/web/`): Next.js dashboard for visualization
- **Debug UI** (`src/app/debug/`): Capture proxy debug console

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

## Commands
```bash
npm run cli -- <command>     # Run CLI commands
npm run dev                  # Start Next.js dev server (includes debug UI)
npm run dev:api              # Start Express API server (not yet implemented)
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

## Proxy
- Runs in-process via `src/proxy/manager.ts` (for debug UI) or directly via `src/proxy/server.ts` (for CLI)
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

## Diff Engine
- **Body diff**: Recursive JSON comparison with `maxDepth` (default 64) to prevent stack overflow
- **Latency diff**: Delta and percentage analysis with NaN/Infinity guards
- **Null handling**: Null bodies/latencies handled gracefully

## CLI Features
- **Colored output**: Mode names (cyan/magenta/yellow), status badges, pass rate bars
- **`--json` flag**: Available on all commands for machine-readable output
- **Input validation**: `--port` and `--sample-rate` validated before use
- **Daemon mode**: Background capture with PID file management and stale PID detection

## Debug UI
- Access at `/debug` when running `npm run dev`
- Start/stop captures, send test requests, view captured traffic live
- API routes at `/api/debug/*`
<!-- END:bottle-cap-agent-rules -->
