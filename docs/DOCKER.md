# Docker Guide

## Overview

This project includes container artifacts for HTTP transport deployment:

- `Dockerfile` (multi-stage)
- `docker-compose.yml` (service orchestration)
- `.dockerignore` (leaner builds)

Runtime defaults:

- service listens on port `3000`
- health endpoint at `/healthz`
- process handles `SIGTERM` and `SIGINT` for graceful shutdown

## Files

- [Dockerfile](../Dockerfile)
- [docker-compose.yml](../docker-compose.yml)
- [.dockerignore](../.dockerignore)

## Prerequisites

- Docker Engine + Docker Compose plugin
- `.env` file at repository root with required runtime variables

Minimum expected `.env` values:

```env
MCP_AUTH_TOKEN=replace_with_strong_random_value
CANVAS_DOMAIN=your-institution.instructure.com
```

If OCR is enabled via Google Vision, also provide a credential file and set:

```env
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/gcp-vision.json
```

## Build image

```bash
npm run docker:build
```

Equivalent:

```bash
docker build -t canvas-mcp-server:latest .
```

## Run with compose

```bash
npm run docker:up
```

Equivalent:

```bash
docker compose up -d
```

Compose defaults in [docker-compose.yml](../docker-compose.yml):

- container name: `canvas-mcp`
- published port: `127.0.0.1:3000:3000`
- restart policy: `unless-stopped`
- reads `.env`
- mounts Google credentials into `/secrets/gcp-vision.json` (read-only)

Stop services:

```bash
npm run docker:down
```

## Health check

Application liveness endpoint:

```bash
curl http://127.0.0.1:3000/healthz
```

Expected response:

```json
{"status":"ok"}
```

Container healthcheck is also configured in Dockerfile to call `/healthz` internally.

## Logs and diagnostics

Follow logs:

```bash
npm run docker:logs
```

Inspect compose status:

```bash
docker compose ps
```

Inspect health status:

```bash
docker inspect --format='{{json .State.Health}}' canvas-mcp
```

## Security notes

- container runs as non-root user
- keep `.env` out of source control
- mount OCR credentials as read-only
- do not expose `MCP_AUTH_TOKEN` in logs
- for remote access, use TLS reverse proxy and network restrictions

## Operational notes

- HTTP mode is default in container
- `/mcp` requires bearer auth (`MCP_AUTH_TOKEN`)
- `/healthz` is intentionally unauthenticated for probes
- on stop/redeploy, graceful signal handling closes transport before exit

## Common issues

### 1) Healthcheck fails

Check:

- service started (`docker compose ps`)
- `MCP_AUTH_TOKEN` is set in `.env`
- no port conflicts on `3000`

### 2) OCR extraction fails

Check:

- `GOOGLE_APPLICATION_CREDENTIALS` host path exists
- mount path is readable inside container (`/secrets/gcp-vision.json`)
- service account has Vision permissions

### 3) Cannot call `/mcp`

Check request headers:

- `Authorization: Bearer <MCP_AUTH_TOKEN>`
- valid Canvas token on initialize (`X-Canvas-Token`)

## Suggested production setup

- run behind TLS reverse proxy
- limit source IPs for `/mcp`
- inject secrets from secret manager
- centralize logs with sensitive-header redaction
- monitor health/restart events
