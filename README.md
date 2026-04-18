# Canvas MCP Server

> Connect Claude (or any MCP-compatible AI) directly to your Canvas LMS — ask about assignments, check deadlines, submit work, and browse announcements without ever leaving your conversation.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.6-purple)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/tests-64%20passing-brightgreen)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What is this?

**Canvas MCP Server** is a [Model Context Protocol](https://modelcontextprotocol.io/) server that bridges AI assistants to the [Canvas LMS REST API](https://canvas.instructure.com/doc/api/). It exposes 13 tools that cover the core student workflow: viewing courses, checking assignments and deadlines, reading announcements, and submitting work.

Built with a focus on:
- **Extensibility** — adding a new Canvas domain (modules, files, discussions) is 3 files and zero refactor
- **Testability** — every HTTP call is mocked via MSW; no real API hits in tests
- **Type safety** — strict TypeScript throughout, Zod schemas at all entry points
- **Clean design** — named patterns (Repository, Strategy, Adapter, etc.) applied where they earn their keep

Originally built for **PUC Minas** (`pucminas.instructure.com`), but works with any Canvas institution — just set `CANVAS_DOMAIN`.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
  - [Getting a Canvas API Token](#getting-a-canvas-api-token)
  - [Environment Variables](#environment-variables)
- [Integrating with AI Clients](#integrating-with-ai-clients)
  - [Claude Desktop](#claude-desktop)
  - [Claude Code (CLI)](#claude-code-cli)
  - [Other MCP Clients](#other-mcp-clients)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Architecture](#architecture)
  - [Directory Structure](#directory-structure)
  - [Design Patterns](#design-patterns)
  - [Data Flow](#data-flow)
- [Extending the Server](#extending-the-server)
- [Testing](#testing)
- [Trade-offs & Decisions](#trade-offs--decisions)
- [Security](#security)
- [Roadmap (Phase 2)](#roadmap-phase-2)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **13 MCP tools** covering the full student lifecycle on Canvas
- **Dual output format** — every tool returns Markdown (human-readable) or JSON (machine-readable) via `response_format`
- **Pagination** — all list tools accept `per_page` and `page`; large responses are truncated with guidance
- **Typed errors** — all Canvas API errors (401, 403, 404, 429, 5xx, timeout) are mapped to descriptive messages; no raw stack traces leak to the AI
- **SSRF protection** — `CANVAS_DOMAIN` is validated against `/^[a-z0-9-]+\.instructure\.com$/i` before any HTTP request
- **Zero singletons** — client is injected via DI; swap for a fake in tests without monkey-patching

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
2. Click your **Avatar** (top right) → **Account** → **Settings**
3. Scroll to **Approved Integration Tokens** → click **+ New Access Token**
4. Give it a name (e.g., "Claude MCP"), set an expiry if desired, and click **Generate Token**
5. **Copy the token immediately** — Canvas will not show it again

> **Security warning:** This token grants full access to your Canvas account — read, write, submit. Treat it like a password. See [Security](#security) for details.

### Environment Variables

Create a `.env` file (never commit it):

```env
# Required — your Canvas personal access token
CANVAS_API_TOKEN=1234~AbCdEfGhIjKlMnOpQrStUvWxYz...

# Optional — defaults to pucminas.instructure.com
# Must match pattern: *.instructure.com
CANVAS_DOMAIN=your-institution.instructure.com
```

**All supported variables:**

| Variable | Required | Default | Description |
|---|---|---|---|
| `CANVAS_API_TOKEN` | Yes | — | Personal access token from Canvas Settings |
| `CANVAS_DOMAIN` | No | `pucminas.instructure.com` | Your institution's Canvas domain |

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

Restart Claude Desktop. You should see a hammer icon (🔨) indicating MCP tools are available.

### Claude Code (CLI)

```bash
# Add to local project config
claude mcp add canvas -- node /absolute/path/to/canvas-mcp-server/dist/index.js

# Then set env vars in your shell or in .claude/settings.json
export CANVAS_API_TOKEN=your_token
export CANVAS_DOMAIN=your-institution.instructure.com
```

Or add directly to `.claude/settings.json`:

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

### Other MCP Clients

The server uses **stdio transport** — it reads JSON-RPC from stdin and writes to stdout. Any MCP-compatible client can spawn it as a subprocess. Refer to your client's documentation for MCP server registration.

---

## Available Tools

All tools are prefixed with `canvas_` to avoid conflicts when used alongside other MCP servers.

### Account & Courses

| Tool | Description |
|---|---|
| `canvas_get_profile` | Returns the authenticated user's name, email, login ID, and Canvas user ID |
| `canvas_list_courses` | Lists enrolled courses. Filterable by `enrollment_state` (`active`, `invited_or_pending`, `completed`) |
| `canvas_get_course` | Full details for a single course including current grade |

### Assignments

| Tool | Description |
|---|---|
| `canvas_list_assignments` | Lists assignments for a course. Supports `bucket` filter (`overdue`, `upcoming`, `unsubmitted`, etc.), `search_term`, and `order_by` |
| `canvas_get_assignment` | Full details for one assignment: due date, points, submission types, grading status |

### Submissions

| Tool | Description |
|---|---|
| `canvas_list_submissions` | Lists the student's own submissions in a course |
| `canvas_get_submission` | Details for a specific submission: grade, score, submission date, lateness |
| `canvas_submit_assignment` | Submits an assignment. Supports `online_text_entry` (HTML body) and `online_url` (http/https link) |

### To-Do & Deadlines

| Tool | Description |
|---|---|
| `canvas_list_todo` | Global to-do list — all pending assignments and quizzes across courses |
| `canvas_list_upcoming_events` | Upcoming assignments and calendar events sorted by date |
| `canvas_list_missing_submissions` | Past-due assignments with no submission. Optionally filtered by `course_ids` |

### Calendar & Announcements

| Tool | Description |
|---|---|
| `canvas_list_calendar_events` | Calendar events and assignments for given courses (`context_codes`). Supports date range filters |
| `canvas_list_announcements` | Announcements from given courses. Filterable by date range |

### Common Parameters

All list tools accept:
- `per_page` (int, 1–100, default 25)
- `page` (int, default 1)
- `response_format` (`"markdown"` or `"json"`, default `"markdown"`)

---

## Usage Examples

These are natural-language prompts you can use with Claude once the server is connected.

---

**Check pending work:**
> "What assignments do I have due this week?"

Claude will call `canvas_list_upcoming_events` and/or `canvas_list_todo`.

---

**Find missing submissions:**
> "Which assignments have I missed or not submitted yet?"

Claude will call `canvas_list_missing_submissions`.

---

**Submit an assignment:**
> "Submit assignment 201 in course 101 with the text 'My analysis of the software requirements: ...'"

Claude will call `canvas_submit_assignment` with `submission_type: "online_text_entry"`.

---

**Check grades:**
> "What's my current grade in Engenharia de Software?"

Claude will call `canvas_list_courses` then `canvas_get_course` for the specific course.

---

**Read announcements:**
> "Are there any new announcements in my courses?"

Claude will call `canvas_list_courses` to get IDs, then `canvas_list_announcements` with the context codes.

---

**Plan the week:**
> "Give me a summary of everything I need to do before Sunday."

Claude will combine `canvas_list_todo`, `canvas_list_upcoming_events`, and `canvas_list_missing_submissions`.

---

## Architecture

### Directory Structure

```
canvas-mcp-server/
├── src/
│   ├── index.ts                  # Entry point: creates client, registers tools, starts stdio transport
│   ├── constants.ts              # CHARACTER_LIMIT, DEFAULT_PAGE_SIZE, domain validation regex
│   ├── types.ts                  # TypeScript interfaces for all Canvas API objects
│   ├── services/
│   │   ├── canvasClient.ts       # Adapter + Factory: axios wrapper, auth injection, Link header parser
│   │   ├── errors.ts             # Result<T,E> type, ok/err constructors, mapApiError()
│   │   └── formatters.ts         # Strategy: Formatter<T> interface, Markdown & JSON implementations
│   ├── repositories/             # Repository pattern — one file per Canvas API domain
│   │   ├── courses.ts
│   │   ├── assignments.ts
│   │   ├── submissions.ts
│   │   ├── todo.ts
│   │   ├── calendar.ts
│   │   ├── announcements.ts
│   │   └── profile.ts
│   ├── schemas/
│   │   └── common.ts             # Zod schemas: PaginationSchema, ResponseFormatSchema, CourseIdSchema
│   └── tools/
│       ├── index.ts              # Registry: registerAllTools(server, client)
│       ├── base.ts               # Template Method: executeListTool(), executeSingleTool()
│       ├── courses.ts
│       ├── assignments.ts
│       ├── submissions.ts
│       ├── todo.ts
│       ├── calendar.ts
│       ├── announcements.ts
│       └── profile.ts
├── tests/
│   ├── unit/
│   │   ├── services/             # canvasClient, errors, formatters tests
│   │   ├── repositories/         # courses, submissions, profile tests
│   │   └── schemas/              # common schema validation tests
│   ├── integration/
│   │   └── server.test.ts        # In-memory MCP client ↔ server end-to-end
│   ├── fixtures/                 # Canonical Canvas API JSON response shapes
│   ├── mocks/                    # MSW server + request handlers
│   └── helpers/                  # buildTestClient(), buildInMemoryServer()
├── dist/                         # Compiled output (gitignored)
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Design Patterns

The patterns below were chosen because they solve specific problems in this codebase, not for their own sake.

---

#### Adapter — `src/services/canvasClient.ts`

**Problem:** Canvas has quirks — Link-header pagination, Bearer auth injection, 64-bit IDs, domain validation — that shouldn't leak into business logic.

**Solution:** `ICanvasClient` interface with `get`, `getPaginated`, `post` methods. The concrete `createCanvasClient()` wraps axios and handles all HTTP details. Repositories depend on `ICanvasClient`, not on axios.

**Trade-off:** One extra abstraction layer. Worth it because tests inject a real client against MSW (no mocking internal code), and swapping HTTP libraries later is a 1-file change.

---

#### Repository — `src/repositories/`

**Problem:** Repositories organize domain-specific Canvas calls. Without them, tools would directly compose raw HTTP paths, making each tool aware of Canvas URL conventions.

**Solution:** One class per domain (`CoursesRepository`, `AssignmentsRepository`, etc.), each taking `ICanvasClient` in the constructor. Tools call repos; repos call the client.

**Trade-off:** More files, but each file is small (30–60 lines) and has a single responsibility. Testing a repository is a 10-line test against MSW.

---

#### Strategy — `src/services/formatters.ts`

**Problem:** Every list tool can return Markdown or JSON, but the formatting logic shouldn't live inside each tool handler.

**Solution:** `Formatter<T>` interface with `format(item)` and `formatList(items, total)`. Two implementations per type: `*MarkdownFormatter` and `*JsonFormatter`. Tools call `selectFormatter(format, md, json)` to pick at runtime.

**Trade-off:** More classes. Adding a third format (CSV, for example) means adding one class per type — but zero changes to tool handlers.

---

#### Factory — `createCanvasClient(config)` / `createClientFromEnv()`

**Problem:** Need different clients for production (reads env vars) and tests (custom config, no env vars required).

**Solution:** `createCanvasClient(config)` builds a client from explicit config. `createClientFromEnv()` reads env vars and calls the former. Tests use `buildTestClient()` which also calls the former with test config.

**Trade-off:** None meaningful. Factories are the right tool here.

---

#### Template Method — `src/tools/base.ts`

**Problem:** All 8 list tools share the same flow: fetch → check error → format → truncate → wrap in MCP response. Copy-pasting this is fragile.

**Solution:** `executeListTool(fetchFn, formatter, format)` and `executeSingleTool(fetchFn, formatter)` handle the common flow. Tool handlers provide only the fetch lambda and formatter.

**Trade-off:** Slightly less flexibility per tool. In practice, all list tools needed the same flow, so no tool needed to deviate.

---

#### Registry — `src/tools/index.ts`

**Problem:** `index.ts` (entry point) shouldn't know about individual tool files. New domains shouldn't require changes in multiple places.

**Solution:** Each tool file exports `register(server, client)`. `registerAllTools(server, client)` in `tools/index.ts` calls each. `src/index.ts` calls only `registerAllTools`.

**Trade-off:** One `tools/index.ts` still needs updating per new domain — but that is the only place.

---

#### Result / Either — `src/services/errors.ts`

**Problem:** Using thrown exceptions for expected HTTP errors (401, 404, etc.) makes error handling implicit and easy to forget.

**Solution:** `Result<T, CanvasError>` union type. `ok(value)` and `err(error)` constructors. All async operations return `Result`, never throw. Callers are forced to check `result.ok` before using the value.

**Trade-off:** More verbose call sites (`if (!result.ok) return ...`). Worth it for the explicitness — it is impossible to forget to handle an error.

---

#### Dependency Injection (constructor injection)

**Problem:** Without DI, repositories would call `createClientFromEnv()` directly, making them untestable without env vars.

**Solution:** Repositories and tools receive `ICanvasClient` as a constructor argument / function parameter. `src/index.ts` is the single composition root.

**Trade-off:** Wiring must be done explicitly in `index.ts` and in test helpers. Acceptable for this scale.

### Data Flow

```
User asks Claude a question
        │
        ▼
Claude calls MCP tool (e.g. canvas_list_assignments)
        │
        ▼
Tool handler (src/tools/assignments.ts)
  └─ Validates input via Zod schema
  └─ Calls AssignmentsRepository.list(params)
        │
        ▼
AssignmentsRepository (src/repositories/assignments.ts)
  └─ Calls ICanvasClient.getPaginated("/courses/:id/assignments", params)
        │
        ▼
canvasClient (src/services/canvasClient.ts)
  └─ Sends GET to https://{CANVAS_DOMAIN}/api/v1/courses/:id/assignments
  └─ Injects Authorization header
  └─ Parses Link header for pagination
  └─ Returns Result<PaginatedResponse<CanvasAssignment>>
        │
        ▼
Repository returns Result to tool handler
        │
        ▼
Tool handler
  └─ On error: formats with formatError() → returns MCP error text
  └─ On success: selects formatter (Markdown or JSON)
  └─ Calls executeListTool() → truncates if > 25k chars
  └─ Returns { content, structuredContent }
        │
        ▼
Claude receives formatted response and answers the user
```

---

## Extending the Server

Adding a new Canvas domain (e.g., Modules) requires **3 files** and **zero changes** to existing code:

### 1. Create the repository

```typescript
// src/repositories/modules.ts
import type { ICanvasClient } from "../services/canvasClient.js";
import type { Result } from "../services/errors.js";
import type { CanvasModule, PaginatedResponse } from "../types.js";

export class ModulesRepository {
  constructor(private readonly client: ICanvasClient) {}

  async list(courseId: number): Promise<Result<PaginatedResponse<CanvasModule>>> {
    return this.client.getPaginated(`/courses/${courseId}/modules`);
  }
}
```

### 2. Create the tool file

```typescript
// src/tools/modules.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ModulesRepository } from "../repositories/modules.js";
import { executeListTool } from "./base.js";
import type { ICanvasClient } from "../services/canvasClient.js";
// ... formatters, schemas

export function register(server: McpServer, client: ICanvasClient): void {
  const repo = new ModulesRepository(client);

  server.registerTool("canvas_list_modules", { /* ... */ }, async (params) => {
    return executeListTool(() => repo.list(params.course_id), formatter, params.response_format);
  });
}
```

### 3. Add one line to the registry

```typescript
// src/tools/index.ts
import * as modules from "./modules.js";     // ← add this

export function registerAllTools(server: McpServer, client: ICanvasClient): void {
  // ... existing registrations
  modules.register(server, client);           // ← add this
}
```

That's it. No other files change.

---

## Testing

```bash
npm test                  # run all tests once
npm run test:watch        # re-run on file change
npm run test:coverage     # run with V8 coverage report
npm run test:unit         # unit tests only
npm run test:integration  # integration tests only
```

### Test strategy

| Layer | What is tested | How |
|---|---|---|
| `services/errors` | Status code → error code mapping, ok/err helpers | Unit — pure functions |
| `services/formatters` | Markdown/JSON output for each entity, date formatting, edge cases | Unit — pure functions |
| `services/canvasClient` | Auth injection, Link header parsing, domain validation, error propagation | Unit — MSW intercepts HTTP |
| `repositories/*` | Correct endpoint construction, param passing, happy path + error paths | Unit — MSW intercepts HTTP |
| `schemas/common` | Zod validation accepts/rejects boundary values | Unit — pure Zod |
| `integration/server` | 13 tools visible, tool call returns expected content | In-memory MCP client ↔ server via `InMemoryTransport` |

**64 tests, 8 test files, ~1.7s total runtime.**

### Key principle: never mock internal code

Tests use [MSW](https://mswjs.io/) to intercept HTTP at the network boundary. Repositories, formatters, error handlers — all run as real production code against the mock API. This means a bug in a repository is caught by the test, not hidden behind a mock.

### Adding tests for a new domain

1. Add fixture JSON in `tests/fixtures/<domain>.list.json` (real Canvas API response shape)
2. Add MSW handlers in `tests/mocks/handlers.ts`
3. Write `tests/unit/repositories/<domain>.test.ts`
4. Write `tests/integration/tools.<domain>.test.ts`

---

## Trade-offs & Decisions

### Why stdio and not HTTP transport?

MCP offers two transports: stdio (subprocess) and Streamable HTTP (web server). Stdio was chosen because:
- This server runs locally for a single user (student's machine)
- No deployment infrastructure needed
- Claude Desktop and Claude Code both support subprocess MCP servers out of the box
- HTTP transport adds operational complexity (port management, auth for the MCP endpoint, CORS) with no benefit for this use case

If you need to host this server remotely for multiple users, switching to Streamable HTTP requires changing only `src/index.ts`.

### Why TypeScript and not Python?

- The MCP TypeScript SDK has better type coverage for tool registration patterns
- Static typing catches configuration errors at build time rather than runtime
- `zod` schema inference (`z.infer<typeof Schema>`) eliminates redundant type definitions
- AI models generate higher-quality TypeScript for this use case due to its prevalence

### Why Zod for validation?

Canvas API IDs are integers; tool inputs are strings/numbers from JSON. Zod provides both runtime validation and static type inference from the same definition. Alternatives (manual guards, io-ts) were rejected for ergonomics.

### Why Result<T> instead of try/catch?

HTTP errors like 401 and 404 are **expected outcomes**, not exceptions. Modeling them as `Result<T, CanvasError>` makes them visible in the type signature and forces callers to handle them. `try/catch` makes it easy to forget error handling, which would cause the AI to receive raw axios error objects instead of helpful messages.

### Why not support file upload (`online_upload`) in MVP?

Canvas file upload is a 3-step process: (1) notify Canvas, (2) upload to a returned pre-signed URL, (3) confirm. This requires storing intermediate state (upload URL, file ID) between tool calls, which is awkward in stateless MCP tools. The MVP supports `online_text_entry` and `online_url`, which cover most student submissions. File upload is scoped to Phase 2.

### Character limit (25,000)

MCP tool responses become part of the AI's context window. Returning 1,000 assignments in a single call would waste context and degrade response quality. The 25k character soft cap truncates with a message advising the user to paginate or filter. This is a pragmatic default — adjust `CHARACTER_LIMIT` in `src/constants.ts` if needed.

### SSRF protection for `CANVAS_DOMAIN`

Without validation, a misconfigured `CANVAS_DOMAIN=evil.com` could cause the server to send the Bearer token to an attacker-controlled server. The regex `/^[a-z0-9-]+\.instructure\.com$/i` ensures all requests go to Instructure-controlled infrastructure.

---

## Security

- **Token storage:** Always pass `CANVAS_API_TOKEN` via environment variable. Never hard-code it. The `.env` file is in `.gitignore`.
- **Token scope:** A Canvas personal access token grants full access to your account — the same as your password. Revoke it immediately if compromised (Canvas Settings → Approved Integration Tokens → Revoke).
- **Token exposure in logs:** The server never logs the token. Error messages never include it.
- **SSRF protection:** `CANVAS_DOMAIN` is validated against `*.instructure.com` before any HTTP request.
- **No data persistence:** This server makes requests and returns responses. It does not store, cache, or log any Canvas data.
- **Submission tool:** `canvas_submit_assignment` sends a real submission. Claude will ask for confirmation before calling it (it is annotated `readOnlyHint: false`), but verify the content before approving.

---

## Roadmap (Phase 2)

The architecture already supports these additions — they require only new repository + tool files:

- [ ] **Modules** — `canvas_list_modules`, `canvas_list_module_items`, `canvas_mark_item_done`
- [ ] **File upload submissions** — 3-step Canvas upload flow + `online_upload` support in `canvas_submit_assignment`
- [ ] **Discussion topics** — `canvas_list_discussions`, `canvas_post_reply`
- [ ] **Grades** — `canvas_get_grades`, gradebook summary per course
- [ ] **Quizzes** — `canvas_list_quizzes`, `canvas_get_quiz`
- [ ] **Pages** — `canvas_list_pages`, `canvas_get_page`

---

## Contributing

Contributions welcome. Before opening a PR:

1. **Tests are required.** Every new feature must include unit tests for the repository and an integration test for the tool. Follow the [TDD workflow](#test-strategy): write failing tests first.
2. **No mocking internal code.** Use MSW for HTTP; run real production code in tests.
3. **Follow existing patterns.** New domain = new repository file + new tool file + one line in `tools/index.ts`.
4. **TypeScript strict.** No `any`, no `@ts-ignore`. All async functions have explicit return types.
5. Run `npm run build && npm test` before submitting.

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgements

- [Model Context Protocol](https://modelcontextprotocol.io/) — Anthropic's open protocol for AI tool integration
- [Canvas LMS REST API](https://canvas.instructure.com/doc/api/) — Instructure's comprehensive API documentation
- [MSW](https://mswjs.io/) — Mock Service Worker, used for all HTTP mocking in tests
