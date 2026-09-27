# Bottle-Cap

Incident replay tool - capture production HTTP traffic via proxy, store it, replay against staging to verify fixes before deployment.

## How It Works

1. **Capture** — Route traffic through a proxy that records requests/responses to SQLite + S3
2. **Replay** — Replay captured traffic against a target (your staging environment)
3. **Compare** — View diffs between original and replayed responses to verify fixes

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client     │────▶│  Proxy       │────▶│  Target     │
│              │     │  (captures)  │     │  (prod)     │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────▼───────┐
                    │  SQLite + S3  │
                    │  (stored)     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐     ┌─────────────┐
                    │  Replay      │────▶│  Staging    │
                    │  Engine      │     │  (fixed)    │
                    └──────┬───────┘     └─────────────┘
                           │
                    ┌──────▼───────┐
                    │  Diff View   │
                    │  (results)   │
                    └──────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Start the dashboard
npm run dev

# Open http://localhost:3000
```

The dashboard walks you through the full workflow:
1. Go to **Capture** to start recording traffic
2. Send requests through the proxy
3. Stop the capture
4. Go to **New Replay** to replay against your staging target
5. View results with diff comparison and latency charts

## Commands

```bash
npm run dev              # Dashboard + capture console (port 3000)
npm run dev:api          # Express REST API (port 3001)
npm run cli -- <cmd>     # CLI commands
npm test                 # Run tests
npm run lint             # ESLint
```

## CLI Usage

```bash
# Start capturing traffic
npm run cli -- capture start \
  --name "pre-deploy" \
  --service "my-api" \
  --target https://api.staging.example.com

# Run in background
npm run cli -- capture start \
  --name "pre-deploy" \
  --service "my-api" \
  --target https://api.staging.example.com \
  --daemon

# List captures
npm run cli -- capture list

# Stop a capture
npm run cli -- capture stop <id>

# Execute a replay
npm run cli -- replay run \
  --capture <id> \
  --target https://api.staging-fixed.example.com \
  --mode burst

# View replay results
npm run cli -- replay results <id>

# Compare original vs replayed
npm run cli -- diff <id>

# Skip TLS verification
npm run cli -- replay run \
  --capture <id> \
  --target https://staging.local:8443 \
  --no-reject-unauthorized
```

### Replay Modes

| Mode | Flag | Description |
|------|------|-------------|
| **paced** | `--mode paced` | Replay with original timing between requests |
| **burst** | `--mode burst` | Fire all requests as fast as possible |
| **throttled** | `--mode throttled` | Rate-limited (requires `--rate-limit`) |

## REST API

Base URL: `http://localhost:3001` (start with `npm run dev:api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/captures` | Create capture + start proxy |
| `GET` | `/api/captures` | List captures |
| `GET` | `/api/captures/:id` | Get capture details |
| `DELETE` | `/api/captures/:id` | Stop active capture |
| `POST` | `/api/replays` | Create replay (runs in background) |
| `GET` | `/api/replays` | List replays |
| `GET` | `/api/replays/:id` | Get replay + summary |
| `POST` | `/api/replays/:id/cancel` | Cancel running replay |
| `GET` | `/api/results/:replayId` | Get replay results |
| `GET` | `/api/stats/:captureId` | Capture statistics |

```bash
# Create a capture
curl -X POST http://localhost:3001/api/captures \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"my-api","targetUrl":"https://api.staging.example.com"}'

# Start a replay
curl -X POST http://localhost:3001/api/replays \
  -H "Content-Type: application/json" \
  -d '{"captureId":"<id>","targetUrl":"https://api.staging-fixed.example.com","mode":"burst"}'

# Get results
curl http://localhost:3001/api/results/<replay-id>
```

Set `BOTTLECAP_API_KEY` env var to enable auth (all requests require `Authorization: Bearer <key>`).

## Dashboard

The web dashboard at `http://localhost:3000` provides:

- **Dashboard home** — Overview stats, recent captures/replays
- **Capture console** — Start/stop captures, send test requests
- **Capture detail** — Request list, replay history
- **Replay list** — Paginated with status and pass rate
- **Replay creation** — Form with capture preselection
- **Replay detail** — Live progress animation, results table, diff viewer, latency chart
- **Docs** — CLI reference and API reference

## Configuration

Create `bottlecap.config.ts` or use environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BOTTLECAP_DB_PATH` | `./data/bottlecap.db` | SQLite database path |
| `S3_ENDPOINT` | `http://localhost:9000` | S3/MinIO endpoint |
| `S3_BUCKET` | `bottlecap` | S3 bucket name |
| `API_PORT` | `3001` | Express API port |
| `BOTTLECAP_API_KEY` | — | API key for auth |

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Database**: SQLite (better-sqlite3)
- **Object Storage**: S3/MinIO
- **Web UI**: Next.js 16 + React 19 + Tailwind CSS v4
- **API**: Express 5
- **CLI**: Commander.js
- **Testing**: Vitest + Supertest

## Project Structure

```
src/
├── cli/          # CLI commands
├── proxy/        # HTTP capture proxy
├── storage/      # SQLite + S3 repositories
├── replay/       # Replay engine (paced/burst/throttled)
├── diff/         # Response comparison
├── api/          # Express REST API
├── web/          # Reusable React components
└── app/          # Next.js pages + dashboard API routes
```
