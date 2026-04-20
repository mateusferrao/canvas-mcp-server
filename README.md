# Canvas MCP Server

> Connect Claude (or any MCP-compatible AI) directly to your Canvas LMS — check assignments, read content, post to discussions, upload files, extract document text, and more without leaving your conversation.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.6-purple)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/tests-152%20passing-brightgreen)](docs/CONTRIBUTING.md#testing)
[![Tools](https://img.shields.io/badge/tools-43-orange)](docs/TOOLS.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Canvas MCP Server** is a [Model Context Protocol](https://modelcontextprotocol.io/) server that bridges AI assistants to the [Canvas LMS REST API](https://canvas.instructure.com/doc/api/). It exposes **43 tools** covering the full student workflow — including a complete quiz-taking flow (start attempt → answer questions → submit) and document text extraction (TXT, PDF, DOCX, images via OCR).

Supports **HTTP transport** (default, multi-tenant) and **stdio transport** (opt-in, single-user local).

Originally built for **PUC Minas** (`pucminas.instructure.com`), but works with any Canvas institution — just set `CANVAS_DOMAIN`.

---

## Features

- **43 MCP tools** across 14 categories (courses, assignments, submissions, modules, pages, discussions, conversations, files, documents, planner, grades, quizzes + full quiz-taking flow, calendar, announcements)
- **HTTP transport** (default) — multi-tenant Streamable HTTP; each session gets its own Canvas client bound at `initialize` via `X-Canvas-Token`
- **stdio transport** (opt-in) — single-user local mode; reads `CANVAS_API_TOKEN` from env
- **Dual output format** — every tool returns Markdown or JSON via `response_format`
- **Pagination** — all list tools accept `per_page` and `page`
- **Document extraction** — TXT, PDF, DOCX, and images (OCR via Google Cloud Vision)
- **Typed errors** — all Canvas API errors are mapped to descriptive messages; no raw stack traces leak to the AI
- **SSRF protection** — `CANVAS_DOMAIN` validated against `*.instructure.com` before any HTTP request; file CDN URLs validated before download
- **Zero singletons** — client injected via DI; swappable in tests without monkey-patching

---

## Requirements

- **Node.js** ≥ 18
- A Canvas LMS account with an API access token
- An MCP-compatible AI client (Claude Desktop, Claude Code, or any client implementing the MCP spec)
- **HTTP mode:** `MCP_AUTH_TOKEN` must be set (Bearer token the AI agent service uses to authenticate against the MCP endpoint)
- **OCR (optional):** Google Cloud credentials (`GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_VISION_API_KEY`); set `OCR_ENABLED=false` to disable

---

## Quick Start

### HTTP mode (default — multi-tenant)

```bash
# 1. Clone and install
git clone https://github.com/your-username/canvas-mcp-server.git
cd canvas-mcp-server
npm install

# 2. Configure
cp .env.example .env
# Set MCP_AUTH_TOKEN and (optionally) MCP_HTTP_PORT, CANVAS_DOMAIN, etc.

# 3. Build
npm run build

# 4. Start the HTTP server
MCP_AUTH_TOKEN=supersecret node dist/index.js
# Prints: [canvas-mcp] HTTP server listening on http://127.0.0.1:3000

# 5. Smoke test
curl -s -X POST http://127.0.0.1:3000/mcp \
  -H "Authorization: Bearer supersecret" \
  -H "X-Canvas-Token: <your_canvas_token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}'
```

### stdio mode (opt-in — single-user local)

```bash
# Set transport mode and your Canvas token
MCP_TRANSPORT=stdio CANVAS_API_TOKEN=your_token CANVAS_DOMAIN=your-institution.instructure.com node dist/index.js
# Prints: [canvas-mcp] MCP server started via stdio.
```

---

## Configuration

### Getting a Canvas API Token

1. Log in to your Canvas instance (e.g., `https://pucminas.instructure.com`)
2. Click your **Avatar** → **Account** → **Settings**
3. Scroll to **Approved Integration Tokens** → **+ New Access Token**
4. Give it a name, set an expiry if desired, click **Generate Token**
5. **Copy the token immediately** — Canvas will not show it again

> **Security warning:** This token grants full read/write access to your Canvas account. Treat it like a password. See [Security](#security).

### Environment Variables

#### HTTP Transport

| Variable | Required | Default | Description |
|---|---|---|---|
| `MCP_TRANSPORT` | No | `http` | `http` or `stdio` |
| `MCP_HTTP_PORT` | No | `3000` | HTTP listen port |
| `MCP_HTTP_HOST` | No | `127.0.0.1` | HTTP bind address (loopback = safe default) |
| `MCP_AUTH_TOKEN` | Yes (http mode) | — | Bearer token for the AI agent service to authenticate against the MCP endpoint |
| `MCP_ALLOWED_ORIGINS` | No | — | CSV of allowed CORS origins |
| `SESSION_IDLE_MS` | No | `1800000` | Session GC idle timeout (ms), default 30 min |

#### Canvas

| Variable | Required | Default | Description |
|---|---|---|---|
| `CANVAS_API_TOKEN` | Yes (stdio mode) | — | Canvas personal access token (single-tenant stdio only) |
| `CANVAS_DOMAIN` | No | `pucminas.instructure.com` | Canvas domain (stdio mode or default for HTTP) |

#### OCR & Documents

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | Conditional | — | Path to GCP service account JSON (for OCR) |
| `GOOGLE_VISION_API_KEY` | Conditional | — | GCP Vision API key (alternative to service account) |
| `OCR_ENABLED` | No | `true` | Set to `false` to disable OCR (safe startup without GCP creds) |
| `OCR_MAX_BYTES` | No | `10485760` | Max image size for OCR (10 MB) |

#### Limits

| Variable | Required | Default | Description |
|---|---|---|---|
| `DOCUMENT_DOWNLOAD_MAX_BYTES` | No | `26214400` | Max file size for download (25 MB) |
| `CANVAS_UPLOAD_MAX_BYTES` | No | `52428800` | Max file size for upload (50 MB) |

---

## Integrating with AI Clients

### HTTP mode (multi-tenant agent service)

In HTTP mode the server is a long-running process. The AI agent service authenticates with a Bearer token and passes each user's Canvas token per-session at `initialize` time.

**Request headers:**
- `Authorization: Bearer <MCP_AUTH_TOKEN>` — authenticates the agent service against the MCP server
- `X-Canvas-Token: <user_canvas_token>` — binds the session to a specific Canvas user (sent once at `initialize`)

**MCP endpoint:** `POST http://<host>:<port>/mcp`

**Curl smoke test:**

```bash
curl -s -X POST http://127.0.0.1:3000/mcp \
  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
  -H "X-Canvas-Token: $CANVAS_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "smoke-test", "version": "0" }
    }
  }'
```

### stdio mode (single-user local — Claude Desktop / Claude Code)

#### Claude Desktop

Edit `claude_desktop_config.json`:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "canvas": {
      "command": "node",
      "args": ["/absolute/path/to/canvas-mcp-server/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "CANVAS_API_TOKEN": "your_token_here",
        "CANVAS_DOMAIN": "your-institution.instructure.com"
      }
    }
  }
}
```

Restart Claude Desktop. A hammer icon (🔨) confirms MCP tools are available.

#### Claude Code (CLI)

```bash
claude mcp add canvas -- node /absolute/path/to/canvas-mcp-server/dist/index.js
export MCP_TRANSPORT=stdio
export CANVAS_API_TOKEN=your_token
export CANVAS_DOMAIN=your-institution.instructure.com
```

Or add the same JSON block above to `.claude/settings.json` under `"mcpServers"`.

#### Other MCP Clients (stdio)

Set `MCP_TRANSPORT=stdio`. The server reads JSON-RPC from stdin and writes to stdout. Any MCP-compatible client can spawn it as a subprocess.

---

## Available Tools

43 tools across 14 categories. See **[docs/TOOLS.md](docs/TOOLS.md)** for the full reference with parameters and usage examples.

| Category | Tools |
|---|---|
| Account & Courses | `canvas_get_profile`, `canvas_list_courses`, `canvas_get_course` |
| Assignments | `canvas_list_assignments`, `canvas_get_assignment` |
| Submissions | `canvas_list_submissions`, `canvas_get_submission`, `canvas_submit_assignment` |
| To-Do & Deadlines | `canvas_list_todo`, `canvas_list_upcoming_events`, `canvas_list_missing_submissions` |
| Calendar & Announcements | `canvas_list_calendar_events`, `canvas_list_announcements` |
| Modules | `canvas_list_modules`, `canvas_list_module_items`, `canvas_mark_module_item_done` |
| Pages | `canvas_list_pages`, `canvas_get_page_content` |
| Discussions | `canvas_list_discussions`, `canvas_get_discussion`, `canvas_post_discussion_entry` |
| Conversations | `canvas_list_conversations`, `canvas_get_conversation`, `canvas_send_message` |
| Files | `canvas_upload_file` |
| Documents (Phase 4) | `canvas_list_files`, `canvas_get_file`, `canvas_download_file`, `canvas_extract_document_text`, `canvas_resolve_task_files` |
| Planner | `canvas_list_planner_notes`, `canvas_manage_planner_note` |
| Grades | `canvas_get_course_grades` |
| Quizzes | `canvas_list_quizzes`, `canvas_get_quiz` |
| Quiz-Taking Flow | `canvas_list_quiz_questions`, `canvas_start_quiz_attempt`, `canvas_get_quiz_submission_questions`, `canvas_answer_quiz_question`, `canvas_complete_quiz_attempt`, `canvas_list_quiz_submissions`, `canvas_get_quiz_submission`, `canvas_get_quiz_time_left` |

---

## Security

- Store secrets in `.env` only — never commit them (`.env` is in `.gitignore`)
- A Canvas token grants full account access — revoke it immediately if compromised (Canvas Settings → Approved Integration Tokens → Revoke)
- The server never logs Canvas tokens or the MCP Bearer token
- `MCP_AUTH_TOKEN` protects the HTTP endpoint — use a strong random value and rotate it if compromised
- `CANVAS_DOMAIN` is validated against `*.instructure.com` to prevent SSRF; file CDN URLs are also validated before download
- Sessions are garbage-collected after `SESSION_IDLE_MS` of inactivity (default 30 min)
- No data is stored, cached, or persisted — each session is stateless beyond in-memory session binding

---

## Roadmap

### Phase 2 — ✅ Implemented

Modules, Pages (HTML→Markdown), Discussions, Conversations/Inbox, File upload (3-step S3), Planner Notes, Grades, Quizzes.

### Phase 3 — ✅ Implemented

- [x] **Quiz-taking flow** — full end-to-end: list questions, start attempt, answer (all question types with client-side validation), complete, review score, time left

### Phase 4 — ✅ Implemented

- [x] **HTTP transport** — multi-tenant Streamable HTTP with per-session Canvas client binding
- [x] **Document extraction** — TXT, PDF, DOCX text extraction; OCR for images via Google Cloud Vision
- [x] **File management** — `canvas_list_files`, `canvas_get_file`, `canvas_download_file`
- [x] **Task file resolver** — `canvas_resolve_task_files` parses assignment/page/discussion HTML, finds embedded Canvas file links, extracts text concurrently

### Future

- [ ] Grading periods / GPA aggregation
- [ ] OAuth 2.0 flow (browser-based auth)
- [ ] Notification preferences
- [ ] Quiz flag/unflag questions, `file_upload_question` type

---

## Documentation

- [docs/TOOLS.md](docs/TOOLS.md) — Full tool reference and usage examples
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Design patterns, data flow, trade-off decisions, extending the server
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — Testing strategy, TDD workflow, adding new domains

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgements

- [Model Context Protocol](https://modelcontextprotocol.io/) — Anthropic's open protocol for AI tool integration
- [Canvas LMS REST API](https://canvas.instructure.com/doc/api/) — Instructure's comprehensive API documentation
- [MSW](https://mswjs.io/) — Mock Service Worker, used for all HTTP mocking in tests
