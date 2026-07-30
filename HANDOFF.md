# Phase 4 Handoff

## Current State

**Phase 3 (Replay Engine + Diff Engine) is complete.** All 107 tests pass, lint is clean, code is committed and pushed to `main`.

- Commit: `d00f975` — Phase 3 implementation
- Commit: `1e2c706` — AGENTS.md update

---

## What Was Built in Phase 3

### Replay Engine (`src/replay/`)
- **`sender.ts`** — HTTP request sender. Rewrites captured URLs to target host, retrieves bodies (S3 or inline), handles timeouts (configurable, default 30s), uses shared HTTP agent with keep-alive.
- **`engine.ts`** — Orchestrator. Loads requests from SQLite by capture_id, builds a `Map<string, HttpRequest>` for O(1) lookup, executes the chosen mode, records diff results per request via `createResult()`, tracks progress via local counter.
- **`modes/pace.ts`** — Maintains original inter-request timing gaps (capped at 30s). Sleep in 100ms chunks with `shouldStop()` checks for responsive cancellation.
- **`modes/burst.ts`** — Sends all requests concurrently up to `maxConcurrent` (default 10). Uses promise-based pool with `.catch()` handlers on every `send()`.
- **`modes/throttle.ts`** — Rate-limited via `sleep(intervalMs)` between sends. `rateLimit` floored to minimum 1 to prevent `Infinity` hang.
- **`modes/index.ts`** — Factory: `createMode(mode)` returns the appropriate mode.

### Diff Engine (`src/diff/`)
- **`body-diff.ts`** — Recursive JSON body comparison. Counts added/removed/changed fields. Falls back to string comparison for non-JSON.
- **`latency-diff.ts`** — Computes delta and percentage change between original and replayed latency.
- **`comparator.ts`** — Orchestrates body + latency comparison into a unified `DiffResult`.

### CLI Updates
- **`src/cli/commands/replay.ts`** — `replay run` now executes the engine end-to-end with `ora` spinner, live progress (`Replaying... 15/42`), Ctrl+C cancellation via `SIGINT` handler in `finally` block, and prints results with ✓/!/✗ icons.
- **`src/cli/commands/diff.ts`** — `diff <id>` now shows field-level body diffs with color coding (green=added, red=removed, yellow=changed).

### Tests (14 files, 107 tests)
- `tests/replay/sender.test.ts` — URL rewriting, body retrieval
- `tests/replay/engine.test.ts` — Full integration (mock target + SQLite)
- `tests/replay/modes/pace.ts`, `burst.test.ts`, `throttle.test.ts` — Mode-specific tests
- `tests/diff/body-diff.test.ts` — 13 JSON diff cases
- `tests/diff/latency-diff.test.ts` — 9 latency analysis cases
- `tests/diff/comparator.test.ts` — 5 comparison orchestration cases

---

## E2E Dry Run Results

Ran the full workflow: capture → traffic → stop → replay → diff → list → results.

### Setup
- Echo server on `http://127.0.0.1:9999` (mirrors request details as JSON)
- Capture proxy on `http://localhost:8888` → forwarded to echo server
- Replay mode: `burst`

### Traffic Sent (6 requests)
1. `GET /api/users`
2. `POST /api/orders` with JSON body
3. `GET /api/products?page=2&limit=5`
4. `GET /api/users/42`
5. `DELETE /api/orders/100`
6. `PUT /api/users/42` with JSON body

### Results
- **Capture**: 6/6 requests captured successfully
- **Replay**: 6/6 requests replayed, all HTTP 200, 0 errors
- **Diff**: Status codes all matched (0 status changes). Bodies showed `~1` change each — the `headers.connection` field echoed differently (expected: echo server echoes request headers, replay sender adds its own). Avg latency delta: +29.2ms.
- **Lists**: `capture list`, `replay list`, `replay results`, `capture inspect` all working

### Issue Found During Dry Run
**`--daemon` mode is broken.** The proxy process exits immediately after writing the PID file. The non-daemon mode works fine when run with `nohup &`. Root cause is likely event loop draining — the proxy server isn't keeping the process alive in daemon mode. This is logged as Issue #2 in Phase 4 of PLAN.md.

---

## Code Review Findings (Fixed in Phase 3)

These were caught during code review and fixed before the final commit:

| Issue | Fix |
|-------|-----|
| Unhandled promise rejections in burst/throttle `send().then()` — no `.catch()` | Added rejection handler that decrements `running` and calls `runNext()` |
| `onResult` crash (DB error) left replay stuck in `running` permanently | Wrapped `onResult` in try/catch that sets status to `failed` |
| `getRequestBody` treated any non-`captures/` key as inline body (UUIDs = garbage bytes) | Removed the unsafe fallback |
| `shouldStop()` not checked before `send()` — cancelled replays fire extra requests | Added `shouldStop()` check inside sleep callback before `send()` |
| New HTTP agent per request, never destroyed — connection pool leak | Created single agent per `createSender` call, reused across requests |
| SIGINT handler leaked on `runReplay` failure — stacks handlers | Moved `removeListener` to `finally` block |
| `rateLimit: 0` → `Infinity` → `sleep(Infinity)` hang | `Math.max(rateLimit, 1)` floor |
| O(n²) `requests.find()` on every result | Built `Map<string, HttpRequest>` before execution |
| Paced mode no `shouldStop()` during 30s sleep | Split sleep into 100ms chunks with checks |

---

## Outstanding Issues for Phase 4

From PLAN.md Phase 4 section:

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | HIGH | TLS `rejectUnauthorized: false` hardcoded — no config opt-out | Add `replay.rejectUnauthorized` to `Config`, default `true` |
| 2 | HIGH | `--daemon` mode exits immediately after PID file | Investigate event loop draining in `src/cli/commands/capture.ts` |
| 3 | MEDIUM | Silent 1MB response truncation — truncated body stored as complete | Add `truncated: boolean` flag to `SendResult` |
| 4 | MEDIUM | `computeDiff` recursive with no depth limit — stack overflow risk | Add `maxDepth` parameter (default 64) |
| 5 | LOW | `percentageChange` is `NaN` when `originalMs` is `NaN` | Guard with `Number.isNaN()` check |

---

## Key Files to Know

| File | What it does |
|------|-------------|
| `src/replay/engine.ts` | Core orchestrator — start here to understand replay flow |
| `src/replay/sender.ts` | HTTP sender — URL rewriting, body retrieval, timeout |
| `src/replay/modes/*.ts` | Three pacing strategies |
| `src/diff/body-diff.ts` | JSON body comparison |
| `src/cli/commands/replay.ts` | CLI integration with spinner and results |
| `src/cli/commands/diff.ts` | CLI diff display |
| `src/storage/repositories/replays.ts` | Replay CRUD |
| `src/storage/repositories/results.ts` | Result CRUD + summary view |
| `bottlecap.config.ts` | Config (replay.defaultTimeout, replay.maxConcurrent) |
| `src/types/index.ts` | Shared types: Capture, HttpRequest, Replay, ReplayResult |
| `tests/helpers/mock-target.ts` | `createMockTarget()` for tests |
| `tests/helpers/test-db.ts` | `createTestDb()`, `clearTestDb()` for tests |

---

## Conventions to Follow

- **Testing**: Use `getDatabase()` directly (not `createTestDb()`). Clear tables in `beforeEach` with `DELETE FROM` in FK order. Use `createMockTarget()` from `tests/helpers/mock-target.ts`.
- **IDs**: UUIDs via `uuid` package.
- **Config**: Read from `bottlecap.config.ts`, not hardcoded values.
- **Lint**: `npm run lint` must pass. No unused imports. `prefer-const`. `err` → `{}` if unused.
- **Tests**: `npm run test:run` for single pass. `fileParallelism: false` — tests run serially.
- **Running files**: Use `npx tsx` for TypeScript.
