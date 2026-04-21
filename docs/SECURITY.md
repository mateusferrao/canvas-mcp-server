# Security Model

## Threat model summary

This server is an authenticated proxy from MCP clients to Canvas APIs.
Primary risks:

- unauthorized access to `/mcp`
- leakage or misuse of Canvas user tokens
- SSRF through remote file URLs
- over-privileged runtime/container execution

## Authentication model

### Layer 1: MCP endpoint token

HTTP mode requires:

- `Authorization: Bearer <MCP_AUTH_TOKEN>`

Requests without valid bearer token are rejected before MCP handling.

### Layer 2: per-session Canvas token

At MCP `initialize`, clients provide:

- `X-Canvas-Token`
- optional domain override header (validated)

The token is validated with Canvas and then bound to that MCP session context in memory.

## Session controls

- session IDs are generated server-side
- session context stored in memory only
- idle sessions are evicted (`SESSION_IDLE_MS`, default 30 minutes)
- `DELETE /mcp` closes and removes a session

No token/session material is persisted to disk.

## Domain and SSRF controls

### Canvas API domain validation

Canvas API requests use a validated Canvas domain pattern (Instructure domain constraints), blocking arbitrary upstream hosts.

### File download protection

Document workflows (`canvas_document`) enforce URL safety checks before download/extract operations:

- protocol and host validation
- redirect checks on follow-up URLs
- size limits (`DOCUMENT_DOWNLOAD_MAX_BYTES`)

These controls reduce SSRF and resource abuse risk during file operations.

## Tool-level risk posture

The server intentionally keeps write tools explicit:

- `canvas_submit_assignment`
- `canvas_mark_module_item_done`
- `canvas_post_discussion_entry`
- `canvas_send_message`
- `canvas_manage_planner_note`
- `canvas_upload_file`
- `canvas_quiz_attempt` (`answer`/`complete` are mutating)

Read tools remain consolidated under `canvas_list`, `canvas_get`, and `canvas_document`.

## Runtime hardening

### HTTP surface

- `/mcp` is authenticated
- `/healthz` is intentionally unauthenticated liveness endpoint (returns static `{ "status": "ok" }`)

### Graceful shutdown

The process handles `SIGTERM` and `SIGINT` and stops transport cleanly before exiting.

## Container hardening

The production Docker image uses:

- multi-stage build
- non-root runtime user
- minimal runtime contents (`dist`, production deps)
- healthcheck command against `/healthz`

See [docs/DOCKER.md](DOCKER.md) for operational details.

## Secret handling

Recommended:

- keep `.env` out of version control
- inject `MCP_AUTH_TOKEN` through secure environment mechanisms
- mount OCR credentials as read-only file when required
- rotate Canvas personal tokens if exposure is suspected

Avoid:

- embedding secrets in source code
- logging tokens or raw authorization headers
- exposing service on public interfaces without TLS and network controls

## Deployment recommendations

For non-local deployments:

- place behind TLS-terminating reverse proxy
- restrict source networks for `/mcp`
- use secret manager (or encrypted CI/CD vars)
- monitor container restarts and health failures
- enforce log retention policy without sensitive payload dumps
