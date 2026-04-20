# Security Model

## Authentication layers

### Layer 1 — MCP endpoint bearer token (`MCP_AUTH_TOKEN`)

All requests to `/mcp` require `Authorization: Bearer <MCP_AUTH_TOKEN>`. This token identifies the **AI agent service** as an authorized caller — it is not per-user.

- Compared with `crypto.timingSafeEqual` (no timing side-channel)
- Never logged (middleware filters it before any log statement)
- Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Layer 2 — Canvas user token (`X-Canvas-Token`)

Sent only on the `initialize` request. Identifies a specific Canvas user.

- Validated immediately against `GET /api/v1/users/self` — invalid tokens are rejected at session creation, not at first tool call
- Bound to the session in memory — not re-transmitted after initialize
- Never logged
- GC'd when the session expires (`SESSION_IDLE_MS`, default 30 min)

## SSRF protection

### Canvas API requests

`CANVAS_DOMAIN` validated against `/^[a-z0-9-]+\.instructure\.com$/i` before any HTTP request. Private IPs and localhost blocked.

### File download (`canvas_download_file`, `canvas_extract_document_text`, `canvas_resolve_task_files`)

Canvas signed file URLs resolve to CDN hosts outside `*.instructure.com`. Allowlist:

| Pattern | Covers |
|---|---|
| `*.instructure.com` | Main Canvas domain |
| `inst-fs-*.inscloudgate.net` | Canvas file storage |
| `instructure-uploads.s3*.amazonaws.com` | S3-backed uploads |
| `*.s3.amazonaws.com` | Generic S3 |

Additional controls:
- HTTPS only
- Private IP ranges blocked (10.x, 172.16-31.x, 192.168.x, 127.x, ::1)
- Max 3 redirects; each redirect re-checks hostname
- Content-length pre-check + streaming abort above `DOCUMENT_DOWNLOAD_MAX_BYTES` (default 25 MB)
- Signed URLs are never echoed in error messages

## Session security

- Session IDs are UUIDv4 (`randomUUID()`)
- Sessions expire after `SESSION_IDLE_MS` (default 30 min) of inactivity
- GC runs every minute (or `SESSION_IDLE_MS` if shorter)
- `DELETE /mcp` immediately destroys a session
- No session data written to disk — memory only

## Network defaults

- Default bind: `127.0.0.1` (loopback) — not reachable from other machines
- For remote access: put a reverse proxy (Caddy, nginx) in front with TLS. Do **not** bind `0.0.0.0` directly without TLS.
- `MCP_ALLOWED_ORIGINS` — set to your agent's origin to enable CORS validation (DNS rebinding guard)

## What is NOT protected

- Rate limiting per user — not implemented. One Canvas user could exhaust your institution's Canvas API quota. Implement at the reverse proxy if needed.
- The Canvas token is as powerful as the user's Canvas account — it has no scope restriction. Revoke it from Canvas Settings if compromised.

## GCP Vision credentials

- Never logged or exposed in tool responses
- Path to service account JSON is read from env, not embedded in code
- Use `OCR_ENABLED=false` in environments without GCP credentials — server starts cleanly
