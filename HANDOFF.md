# Phase 5 Handoff

## Current State

**Phase 4 (CLI Polish + Replay Hardening) is complete.** All 151 tests pass, lint is clean, code is committed and pushed to `main`.

- Commit: `89383e3` — Docs update for Phase 4
- Commit: `3f63254` — Phase 4 implementation

---

## What Was Built in Phase 4

### Migration System (`src/storage/database.ts`)
- **`_schema_migrations` table** tracks which migrations have been applied
- `runMigrations()` now skips already-applied files, wraps each in a transaction
- Auto-runs on first `getDatabase()` call — no manual migrate needed
- Migrations: `000_migration_tracking.sql`, `001_initial.sql`, `002_add_truncation.sql`

### Replay Engine Hardening
- **`sender.ts`** — `rejectUnauthorized` now configurable via `ReplayOptions` (default from `config.replay.rejectUnauthorized`)
- **`engine.ts`** — `runReplay()` accepts `overrides?: { rejectUnauthorized?: boolean }`, safe JSON parsing in `loadRequests()`
- **`modes/burst.ts`** — `onResult` wrapped in try/catch; `send()` rejection records error result
- **`modes/throttle.ts`** — Same error handling as burst
- **`types.ts`** — `SendResult` and `ReplayOptions` updated with `truncated` and `rejectUnauthorized`

### Diff Engine Fixes
- **`body-diff.ts`** — `computeDiff` now accepts `maxDepth` parameter (default 64), prevents stack overflow on deeply nested JSON
- **`latency-diff.ts`** — `analyzeLatency` guards against NaN and Infinity inputs

### CLI Polish (`src/cli/`)
- **`utils/format.ts`** — New helpers: `formatMode()` (colored), `formatStatusBadge()`, `formatStatusCode()`, `formatLatencyDelta()`, `formatProgressBar()`, `formatJson()`
- **All commands** — `--json` flag for machine-readable output
- **`capture.ts`** — Input validation for `--port` and `--sample-rate`, stale PID detection, `closeDatabase()` in daemon signal handlers
- **`replay.ts`** — `--reject-unauthorized` / `--no-reject-unauthorized` flag, colored mode names
- **`diff.ts`** — Null-safe status comparison, truncation indicator
- **`list.ts`** — `--json` flag
- **`index.ts`** — Changed `program.parse()` to `program.parseAsync()` (root cause of daemon mode bug)

### Database Schema Changes
- `replay_results` table now has `truncated BOOLEAN DEFAULT 0` column
- `mapRowToResult()` explicitly converts SQLite integers to booleans (`0` → `false`, `1` → `true`)

---

## Phase 5 Scope: API Layer

### Deliverables
- Express REST API for programmatic access
- API key authentication middleware
- Endpoints matching PLAN.md specification

### API Endpoints (from PLAN.md)

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

### Existing Infrastructure to Reuse
- **Storage repos** — `src/storage/repositories/captures.ts`, `replays.ts`, `results.ts` (all CRUD operations exist)
- **Replay engine** — `src/replay/engine.ts` `runReplay()` (already async, supports progress callback)
- **Diff engine** — `src/diff/comparator.ts` `compareResponses()` (already works)
- **Config** — `bottlecap.config.ts` has `api.port` and `api.apiKey`
- **Types** — `src/types/index.ts` has `Capture`, `HttpRequest`, `Replay`, `ReplayResult`, `ReplaySummary`

### Key Files to Know

| File | What it does |
|------|-------------|
| `src/storage/repositories/captures.ts` | Capture CRUD — `createCapture`, `getCapture`, `listCaptures`, `updateCaptureStatus` |
| `src/storage/repositories/replays.ts` | Replay CRUD — `createReplay`, `getReplay`, `listReplays`, `updateReplayStatus`, `incrementReplayProgress` |
| `src/storage/repositories/results.ts` | Result CRUD — `createResult`, `getResultsByReplay`, `getReplaySummary` |
| `src/replay/engine.ts` | `runReplay(replayId, onProgress?, overrides?)` — returns `ReplaySummary` |
| `src/types/index.ts` | All domain types |
| `bottlecap.config.ts` | Config with `api.port` and `api.apiKey` |
| `src/storage/database.ts` | `getDatabase()`, `closeDatabase()`, `runMigrations()` |

### Conventions to Follow

- **Testing**: Use `getDatabase()` directly. Clear tables in `beforeEach` with `DELETE FROM` in FK order. Use `createMockTarget()` from `tests/helpers/mock-target.ts`.
- **IDs**: UUIDs via `uuid` package.
- **Config**: Read from `bottlecap.config.ts`, not hardcoded values.
- **Lint**: `npm run lint` must pass. No unused imports. `prefer-const`. `err` → `{}` if unused.
- **Tests**: `npm run test:run` for single pass. `fileParallelism: false` — tests run serially.
- **Running files**: Use `npx tsx` for TypeScript.
- **DB access**: `getDatabase()` returns a synchronous `better-sqlite3` instance. All operations are sync.

### Existing Tests to Be Aware Of

| File | Tests |
|------|-------|
| `tests/replay/engine.test.ts` | Integration tests with mock HTTP target + SQLite |
| `tests/replay/sender.test.ts` | URL rewriting, body retrieval |
| `tests/replay/modes/*.test.ts` | Mode-specific tests (burst, pace, throttle) |
| `tests/diff/*.test.ts` | Body diff, latency diff, comparator |
| `tests/cli/format.test.ts` | CLI formatting utilities |

---

## E2E Dry Run Results (Phase 4)

Ran the full workflow: capture → traffic → replay → diff → list → results.

### Setup
- Echo server on `http://127.0.0.1:9999` (mirrors request details as JSON)
- Capture proxy on `http://localhost:8889` → forwarded to echo server
- Replay mode: `burst`

### Results
- **Capture**: Traffic captured successfully
- **Replay**: All three modes (burst, throttled, paced) completed successfully
- **Diff**: Body diffs showing expected differences (echo server returns request details, not original response)
- **CLI**: All commands working with colored output and `--json` flag
- **Boolean conversion**: SQLite `0`/`1` properly converted to `true`/`false` in results

### Issues Found and Fixed During Phase 4

| Issue | Fix |
|-------|-----|
| `program.parse()` discards async promise → daemon mode exits | Changed to `program.parseAsync()` |
| SQLite boolean conversion (0/1 vs true/false) | Explicit conversion in `mapRowToResult()` |
| `JSON.stringify` order-dependent comparison at maxDepth | Reverted to simple comparison (order differences are legitimate at truncation boundary) |
| Burst/throttle send() rejection silently dropped | Now records error result |
| Daemon SIGTERM doesn't close DB | Added `closeDatabase()` to signal handlers |

---

## Key Files to Know (Phase 5)

| File | What it does |
|------|-------------|
| `src/api/server.ts` | Express server (exists but not yet implemented) |
| `src/api/routes/` | Route files (exist but empty) |
| `src/api/middleware/auth.ts` | API key auth (exists but not yet implemented) |
| `bottlecap.config.ts` | Has `api.port` and `api.apiKey` config |

---

## Conventions to Follow

- **Testing**: Use `getDatabase()` directly (not `createTestDb()`). Clear tables in `beforeEach` with `DELETE FROM` in FK order. Use `createMockTarget()` from `tests/helpers/mock-target.ts`.
- **IDs**: UUIDs via `uuid` package.
- **Config**: Read from `bottlecap.config.ts`, not hardcoded values.
- **Lint**: `npm run lint` must pass. No unused imports. `prefer-const`. `err` → `{}` if unused.
- **Tests**: `npm run test:run` for single pass. `fileParallelism: false` — tests run serially.
- **Running files**: Use `npx tsx` for TypeScript.
- **DB access**: `getDatabase()` returns a synchronous `better-sqlite3` instance. All operations are sync.
- **Async operations**: Replay engine is async (`runReplay()` returns a Promise). Use `parseAsync()` for CLI commands.
