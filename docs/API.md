# Bottle-Cap REST API

Base URL: `http://localhost:3001` (configurable via `API_PORT` env var)

All requests and responses use `application/json`.

---

## Authentication

If `BOTTLECAP_API_KEY` environment variable is set, all requests must include:

```
Authorization: Bearer <your-api-key>
```

If no API key is configured, authentication is skipped (local development mode).

**401 Response:**
```json
{
  "error": "Missing or invalid Authorization header"
}
```

---

## Captures

### Create Capture

Start a new capture session and its proxy.

```
POST /api/captures
```

**Request Body:**
```json
{
  "name": "pre-deploy-capture",
  "serviceName": "my-api",
  "targetUrl": "https://api.staging.example.com",
  "sampleRate": 1.0,
  "port": 8080
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | No | null | Human-readable capture name |
| `serviceName` | string | **Yes** | - | Service identifier |
| `targetUrl` | string | **Yes** | - | Target URL to proxy traffic to |
| `sampleRate` | number | No | 1.0 | Sampling rate (0.0 - 1.0) |
| `port` | number | No | 8080 | Proxy listen port (0 for random) |

**Response (201):**
```json
{
  "capture": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "pre-deploy-capture",
    "status": "active",
    "service_name": "my-api",
    "target_url": "https://api.staging.example.com",
    "sample_rate": 1.0,
    "started_at": "2025-01-15T10:30:00.000Z",
    "stopped_at": null,
    "request_count": 0,
    "config": null
  },
  "proxyPort": 8080
}
```

**Errors:**
- `400` - Missing `serviceName` or `targetUrl`, or invalid `sampleRate`/`port`
- `409` - Port already in use
- `500` - Server error

---

### List Captures

```
GET /api/captures?limit=50&offset=0
```

| Query Param | Type | Default | Description |
|-------------|------|---------|-------------|
| `limit` | number | 50 | Max results to return |
| `offset` | number | 0 | Pagination offset |

**Response (200):**
```json
{
  "captures": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "pre-deploy-capture",
      "status": "active",
      "service_name": "my-api",
      "target_url": "https://api.staging.example.com",
      "sample_rate": 1.0,
      "started_at": "2025-01-15T10:30:00.000Z",
      "stopped_at": null,
      "request_count": 42,
      "config": null,
      "isActive": true,
      "proxyPort": 8080
    }
  ]
}
```

---

### Get Capture

```
GET /api/captures/:id
```

**Response (200):**
```json
{
  "capture": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "pre-deploy-capture",
    "status": "active",
    "service_name": "my-api",
    "target_url": "https://api.staging.example.com",
    "sample_rate": 1.0,
    "started_at": "2025-01-15T10:30:00.000Z",
    "stopped_at": null,
    "request_count": 42,
    "config": null,
    "isActive": true,
    "proxyPort": 8080
  }
}
```

**Errors:**
- `404` - Capture not found

---

### Stop Capture

Stop an active capture's proxy and mark it completed.

```
DELETE /api/captures/:id
```

**Response (200):**
```json
{
  "capture": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "pre-deploy-capture",
    "status": "completed",
    "service_name": "my-api",
    "target_url": "https://api.staging.example.com",
    "sample_rate": 1.0,
    "started_at": "2025-01-15T10:30:00.000Z",
    "stopped_at": "2025-01-15T10:35:00.000Z",
    "request_count": 42,
    "config": null
  }
}
```

**Errors:**
- `404` - Capture not found
- `409` - Capture is not active

---

## Replays

### Create Replay

Start a replay job in the background. Returns immediately with the replay ID; poll `GET /api/replays/:id` for status.

```
POST /api/replays
```

**Request Body:**
```json
{
  "name": "post-fix-verify",
  "captureId": "550e8400-e29b-41d4-a716-446655440000",
  "targetUrl": "https://api.staging-fixed.example.com",
  "mode": "burst",
  "rateLimit": 100,
  "rejectUnauthorized": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | No | null | Replay name |
| `captureId` | string | **Yes** | - | Capture ID to replay |
| `targetUrl` | string | **Yes** | - | Target URL for replay |
| `mode` | string | No | "paced" | `paced`, `burst`, or `throttled` |
| `rateLimit` | number | No | - | Required for `throttled` mode |
| `rejectUnauthorized` | boolean | No | true | Verify TLS certificates |

**Response (202):**
```json
{
  "replay": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "post-fix-verify",
    "capture_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "target_url": "https://api.staging-fixed.example.com",
    "mode": "burst",
    "rate_limit": null,
    "config": null,
    "started_at": null,
    "completed_at": null,
    "total_requests": 0,
    "completed_requests": 0,
    "created_at": "2025-01-15T10:35:00.000Z",
    "triggered_by": "api"
  }
}
```

**Errors:**
- `400` - Missing `captureId`/`targetUrl`, invalid `mode`, or missing `rateLimit` for throttled mode
- `404` - Capture not found
- `500` - Server error

---

### List Replays

```
GET /api/replays?limit=50&offset=0
```

| Query Param | Type | Default | Description |
|-------------|------|---------|-------------|
| `limit` | number | 50 | Max results |
| `offset` | number | 0 | Pagination offset |

**Response (200):**
```json
{
  "replays": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "post-fix-verify",
      "capture_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "target_url": "https://api.staging-fixed.example.com",
      "mode": "burst",
      "rate_limit": null,
      "config": null,
      "started_at": "2025-01-15T10:35:01.000Z",
      "completed_at": "2025-01-15T10:35:30.000Z",
      "total_requests": 42,
      "completed_requests": 42,
      "created_at": "2025-01-15T10:35:00.000Z",
      "triggered_by": "api"
    }
  ]
}
```

---

### Get Replay

```
GET /api/replays/:id
```

**Response (200):**
```json
{
  "replay": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "completed",
    ...
  },
  "summary": {
    "replay_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "post-fix-verify",
    "status": "completed",
    "mode": "burst",
    "total": 42,
    "identical": 40,
    "status_changed": 1,
    "errors": 1,
    "avg_latency_delta_ms": -5.2
  }
}
```

**Errors:**
- `404` - Replay not found

---

### Cancel Replay

Cancel a running or pending replay.

```
POST /api/replays/:id/cancel
```

**Response (200):**
```json
{
  "replay": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "failed",
    ...
  }
}
```

**Errors:**
- `404` - Replay not found
- `409` - Replay cannot be cancelled (already completed/failed)

---

## Results

### Get Replay Results

```
GET /api/results/:replayId
```

**Response (200):**
```json
{
  "results": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "replay_id": "660e8400-e29b-41d4-a716-446655440001",
      "request_id": "880e8400-e29b-41d4-a716-446655440003",
      "original_status": 200,
      "replayed_status": 200,
      "original_latency_ms": 50.2,
      "replayed_latency_ms": 45.1,
      "body_diff_summary": {
        "added": 0,
        "removed": 0,
        "changed": 0,
        "details": []
      },
      "body_identical": true,
      "truncated": false,
      "error": null,
      "replayed_at": "2025-01-15T10:35:05.000Z"
    }
  ],
  "summary": {
    "replay_id": "660e8400-e29b-41d4-a716-446655440001",
    "total": 42,
    "identical": 40,
    "status_changed": 1,
    "errors": 1,
    "avg_latency_delta_ms": -5.2
  }
}
```

**Errors:**
- `404` - Replay not found

---

## Statistics

### Get Capture Statistics

```
GET /api/stats/:captureId
```

**Response (200):**
```json
{
  "capture": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "pre-deploy-capture",
    "status": "completed",
    ...
  },
  "requestCount": 150,
  "replays": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "status": "completed",
      "mode": "burst",
      "summary": {
        "total": 150,
        "identical": 140,
        "status_changed": 5,
        "errors": 5,
        "avg_latency_delta_ms": -3.1
      }
    }
  ]
}
```

**Errors:**
- `404` - Capture not found

---

## Error Format

All errors return a consistent JSON shape:

```json
{
  "error": "Description of what went wrong"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Authentication required or invalid |
| 404 | Resource not found |
| 409 | Conflict (e.g., port in use, replay already completed) |
| 500 | Internal server error |

---

## Quick Start

```bash
# Start the API server
npm run dev:api

# Create a capture
curl -X POST http://localhost:3001/api/captures \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"my-api","targetUrl":"https://api.staging.example.com","port":0}'

# List captures
curl http://localhost:3001/api/captures

# Start a replay
curl -X POST http://localhost:3001/api/replays \
  -H "Content-Type: application/json" \
  -d '{"captureId":"<capture-id>","targetUrl":"https://api.staging-fixed.example.com","mode":"burst"}'

# Check replay status
curl http://localhost:3001/api/replays/<replay-id>

# Get results
curl http://localhost:3001/api/results/<replay-id>

# Get capture stats
curl http://localhost:3001/api/stats/<capture-id>
```
