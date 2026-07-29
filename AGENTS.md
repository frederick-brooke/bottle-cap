<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:bottle-cap-agent-rules -->
# Bottle-Cap Agent Rules

## Project Overview
Bottle-Cap is an incident replay tool. It captures production HTTP traffic via a proxy, stores it, and replays it against staging environments to verify fixes before deployment.

## Architecture
- **CLI** (`src/cli/`): Commander.js-based CLI for capture, replay, diff commands
- **Proxy** (`src/proxy/`): HTTP proxy that intercepts and records traffic
- **Storage** (`src/storage/`): SQLite database + S3/MinIO object storage
- **Replay** (`src/replay/`): Engine to replay captured requests (paced, burst, throttled)
- **Diff** (`src/diff/`): Compare original vs replayed responses
- **API** (`src/api/`): Express REST API for programmatic access
- **Web UI** (`src/web/`): Next.js dashboard for visualization

## Key Conventions
- Use `tsx` to run TypeScript files directly (CLI, API server)
- Database is SQLite via `better-sqlite3` (synchronous API)
- Object bodies stored in S3/MinIO, referenced by key in SQLite
- All IDs are UUIDs (use `uuid` package)
- Configuration lives in `bottlecap.config.ts`
- Environment variables in `.env` (see `.env.example`)

## Commands
```bash
npm run cli -- <command>     # Run CLI commands
npm run dev:api              # Start Express API server
npm run dev                  # Start Next.js dev server
npm test                     # Run Vitest tests
```

## Database
- Schema: `migrations/001_initial.sql`
- Tables: `captures`, `http_requests`, `replays`, `replay_results`
- View: `replay_summary` for aggregated results
<!-- END:bottle-cap-agent-rules -->
