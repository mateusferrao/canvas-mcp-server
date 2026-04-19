# Canvas MCP Server

> Connect Claude (or any MCP-compatible AI) directly to your Canvas LMS — check assignments, read content, post to discussions, upload files, and more without leaving your conversation.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.6-purple)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/tests-152%20passing-brightgreen)](docs/CONTRIBUTING.md#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Canvas MCP Server** is a [Model Context Protocol](https://modelcontextprotocol.io/) server that bridges AI assistants to the [Canvas LMS REST API](https://canvas.instructure.com/doc/api/). It exposes **38 tools** covering the full student workflow — including a complete quiz-taking flow (start attempt → answer questions → submit).

Originally built for **PUC Minas** (`pucminas.instructure.com`), but works with any Canvas institution — just set `CANVAS_DOMAIN`.

---

## Features

- **38 MCP tools** across 13 categories (courses, assignments, submissions, modules, pages, discussions, conversations, files, planner, grades, quizzes + full quiz-taking flow, calendar, announcements)
- **Dual output format** — every tool returns Markdown or JSON via `response_format`
- **Pagination** — all list tools accept `per_page` and `page`
- **Typed errors** — all Canvas API errors are mapped to descriptive messages; no raw stack traces leak to the AI
- **SSRF protection** — `CANVAS_DOMAIN` validated against `*.instructure.com` before any HTTP request
- **Zero singletons** — client injected via DI; swappable in tests without monkey-patching

---

## Requirements

- **Node.js** ≥ 18
- A Canvas LMS account with an API access token
- An MCP-compatible AI client (Claude Desktop, Claude Code, or any client implementing the MCP spec)

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-username/canvas-mcp-server.git
cd canvas-mcp-server
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your token and domain

# 3. Build
npm run build

# 4. Verify it starts
CANVAS_API_TOKEN=your_token CANVAS_DOMAIN=your-institution.instructure.com node dist/index.js
# Should print: [canvas-mcp-server] Servidor MCP iniciado via stdio.
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

```env
# Required
CANVAS_API_TOKEN=1234~AbCdEfGhIjKlMnOpQrStUvWxYz...

# Optional — defaults to pucminas.instructure.com
CANVAS_DOMAIN=your-institution.instructure.com
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `CANVAS_API_TOKEN` | Yes | — | Personal access token from Canvas Settings |
| `CANVAS_DOMAIN` | No | `pucminas.instructure.com` | Your institution's Canvas domain |
| `CANVAS_UPLOAD_MAX_BYTES` | No | `52428800` (50 MB) | Maximum file size for `canvas_upload_file` |

---

## Integrating with AI Clients

### Claude Desktop

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
        "CANVAS_API_TOKEN": "your_token_here",
        "CANVAS_DOMAIN": "your-institution.instructure.com"
      }
    }
  }
}
```

Restart Claude Desktop. A hammer icon (🔨) confirms MCP tools are available.

### Claude Code (CLI)

```bash
claude mcp add canvas -- node /absolute/path/to/canvas-mcp-server/dist/index.js
export CANVAS_API_TOKEN=your_token
export CANVAS_DOMAIN=your-institution.instructure.com
```

Or add the same JSON block above to `.claude/settings.json` under `"mcpServers"`.

### Other MCP Clients

The server uses **stdio transport** — reads JSON-RPC from stdin, writes to stdout. Any MCP-compatible client can spawn it as a subprocess.

---

## Available Tools

30 tools across 13 categories. See **[docs/TOOLS.md](docs/TOOLS.md)** for the full reference with parameters and usage examples.

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
| Planner | `canvas_list_planner_notes`, `canvas_manage_planner_note` |
| Grades | `canvas_get_course_grades` |
| Quizzes | `canvas_list_quizzes`, `canvas_get_quiz` |
| Quiz-Taking Flow | `canvas_list_quiz_questions`, `canvas_start_quiz_attempt`, `canvas_get_quiz_submission_questions`, `canvas_answer_quiz_question`, `canvas_complete_quiz_attempt`, `canvas_list_quiz_submissions`, `canvas_get_quiz_submission`, `canvas_get_quiz_time_left` |

---

## Security

- Store `CANVAS_API_TOKEN` in `.env` only — never commit it (it's in `.gitignore`)
- A Canvas token grants full account access — revoke it immediately if compromised (Canvas Settings → Approved Integration Tokens → Revoke)
- The server never logs the token
- `CANVAS_DOMAIN` is validated against `*.instructure.com` to prevent SSRF
- No data is stored, cached, or persisted — this server is stateless

---

## Roadmap

### Phase 2 — ✅ Implemented

Modules, Pages (HTML→Markdown), Discussions, Conversations/Inbox, File upload (3-step S3), Planner Notes, Grades, Quizzes.

### Phase 3 — ✅ Partially Implemented

- [x] **Quiz-taking flow** — full end-to-end: list questions, start attempt, answer (all question types with client-side validation), complete, review score, time left

### Phase 4 — Future

- [ ] Grading periods / GPA aggregation
- [ ] OAuth 2.0 flow (browser-based auth)
- [ ] File management (`canvas_list_files`, `canvas_download_file`)
- [ ] Notification preferences
- [ ] Quiz flag/unflag questions, file_upload_question type

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
