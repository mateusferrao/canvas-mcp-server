# Canvas MCP Server

> Connect any MCP-compatible AI to Canvas LMS with a compact, high-signal tool surface.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.6-purple)](https://modelcontextprotocol.io/)
[![Tools](https://img.shields.io/badge/tools-10-orange)](docs/TOOLS.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

`canvas-mcp-server` is a [Model Context Protocol](https://modelcontextprotocol.io/) server for the [Canvas LMS REST API](https://canvas.instructure.com/doc/api/).

The project was refactored from 43 domain-specific tools to **10 consolidated tools** using discriminated-union inputs and dispatcher-based execution.

- Default transport: **HTTP** (multi-tenant)
- Optional transport: **stdio** (single-user local)
- OCR/doc extraction: TXT, PDF, DOCX, images (Google Vision optional)

## Why This Shape

The API surface is intentionally compact to reduce LLM decision overhead:

- 4 consolidated polymorphic tools:
  - `canvas_list`
  - `canvas_get`
  - `canvas_document`
  - `canvas_quiz_attempt`
- 6 standalone write tools:
  - `canvas_submit_assignment`
  - `canvas_mark_module_item_done`
  - `canvas_post_discussion_entry`
  - `canvas_send_message`
  - `canvas_manage_planner_note`
  - `canvas_upload_file`

Hard cut policy is active:

- Legacy tool names were removed
- No backward aliases are registered

See [docs/TOOLS.md](docs/TOOLS.md) for kinds/actions and migration map.

## Quick Start (HTTP)

```bash
git clone https://github.com/your-org/canvas-mcp-server.git
cd canvas-mcp-server
npm install
npm run build

# Required for HTTP mode
set MCP_AUTH_TOKEN=replace_with_strong_random_token

# Optional defaults
set CANVAS_DOMAIN=your-institution.instructure.com
set MCP_HTTP_PORT=3000
set MCP_HTTP_HOST=127.0.0.1

npm start
```

Server endpoint:

- `POST /mcp` (MCP JSON-RPC)
- `GET /healthz` (liveness)

## Quick Start (stdio)

```bash
set MCP_TRANSPORT=stdio
set CANVAS_API_TOKEN=your_canvas_token
set CANVAS_DOMAIN=your-institution.instructure.com
npm start
```

## Docker

A multi-stage Docker image and compose setup are included.

```bash
npm run docker:build
npm run docker:up
curl http://127.0.0.1:3000/healthz
npm run docker:down
```

Container behavior:

- Runs as non-root user
- Exposes port `3000`
- Includes Docker healthcheck against `/healthz`
- Handles `SIGTERM`/`SIGINT` for graceful shutdown

See [docs/DOCKER.md](docs/DOCKER.md) for full details.

## Core Features

- Consolidated input contracts via Zod discriminated unions
- Dispatcher strategy for kind/action routing
- Strong typing with strict TypeScript
- Result-based error handling (`Result<T, E>`) without exception-driven flow
- Repository + formatter patterns preserved
- Multi-tenant HTTP session binding using `X-Canvas-Token` at initialize
- OCR/document extraction pipeline with optional GCP Vision

## Environment Variables

### Transport

- `MCP_TRANSPORT` (`http` default, or `stdio`)
- `MCP_AUTH_TOKEN` (required in HTTP mode)
- `MCP_HTTP_PORT` (default `3000`)
- `MCP_HTTP_HOST` (default `127.0.0.1`)
- `MCP_ALLOWED_ORIGINS` (optional CSV)
- `SESSION_IDLE_MS` (default `1800000`)

### Canvas

- `CANVAS_DOMAIN` (default `pucminas.instructure.com`)
- `CANVAS_API_TOKEN` (required in stdio mode)

### OCR and file limits

- `OCR_ENABLED` (`true` default)
- `GOOGLE_APPLICATION_CREDENTIALS` (optional, for OCR)
- `GOOGLE_VISION_API_KEY` (optional alternative)
- `OCR_MAX_BYTES`
- `DOCUMENT_DOWNLOAD_MAX_BYTES`
- `CANVAS_UPLOAD_MAX_BYTES`

## Validation Commands

```bash
npm run build
npm run test:unit
npm run test:integration
npm run docker:build
```

Compose smoke check:

```bash
npm run docker:up
curl http://127.0.0.1:3000/healthz
npm run docker:down
```

## Documentation

- [docs/TOOLS.md](docs/TOOLS.md): tool contract, kinds/actions, migration map
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): dispatcher architecture, schemas, patterns
- [docs/SECURITY.md](docs/SECURITY.md): auth model, SSRF controls, runtime hardening
- [docs/DOCKER.md](docs/DOCKER.md): image, compose, secrets, operations
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md): development workflow

## License

MIT. See [LICENSE](LICENSE).
