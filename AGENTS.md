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
- **Phase 3** — Replay engine (not started)
- **Phase 4** — CLI polish (not started)
- **Phase 5** — API layer (not started)
- **Phase 6** — Web dashboard (debug UI done, full dashboard not started)

## Architecture
- **CLI** (`src/cli/`): Commander.js-based CLI for capture, replay, diff commands
- **Proxy** (`src/proxy/`): HTTP proxy that intercepts and records traffic
- **Storage** (`src/storage/`): SQLite database + S3/MinIO object storage
- **Replay** (`src/replay/`): Engine to replay captured requests (paced, burst, throttled)
- **Diff** (`src/diff/`): Compare original vs replayed responses
- **API** (`src/api/`): Express REST API for programmatic access
- **Web UI** (`src/web/`): Next.js dashboard for visualization
- **Debug UI** (`src/app/debug/`): Capture proxy debug console

## Key Conventions
- Use `tsx` to run TypeScript files directly (CLI, API server)
- Database is SQLite via `better-sqlite3` (synchronous API)
- Auto-runs migrations on first `getDatabase()` call (no manual migrate needed)
- Object bodies stored in S3/MinIO, referenced by key in SQLite (falls back to inline)
- All IDs are UUIDs (use `uuid` package)
- Configuration lives in `bottlecap.config.ts`
- Environment variables in `.env` (see `.env.example`)
- Tests run serially (`fileParallelism: false`) due to shared SQLite singleton

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
- Schema: `migrations/001_initial.sql`
- Tables: `captures`, `http_requests`, `replays`, `replay_results`
- View: `replay_summary` for aggregated results
- Auto-migrates on first connection via `getDatabase()`

## Proxy
- Runs in-process via `src/proxy/manager.ts` (for debug UI) or directly via `src/proxy/server.ts` (for CLI)
- Sanitizes headers: Authorization, Cookie, Set-Cookie, Proxy-Authorization, X-Api-Key
- Extracts trace_id from: X-Request-ID, X-Trace-ID, traceparent
- Extracts service_version from: X-Service-Version, X-App-Version, X-Version
- S3 body storage with inline SQLite fallback when S3 unavailable

## Debug UI
- Access at `/debug` when running `npm run dev`
- Start/stop captures, send test requests, view captured traffic live
- API routes at `/api/debug/*`
<!-- END:bottle-cap-agent-rules -->
