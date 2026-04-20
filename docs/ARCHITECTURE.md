# Architecture

## Directory Structure

```
canvas-mcp-server/
├── src/
│   ├── index.ts                  # Entry point: dispatches to HTTP or stdio based on MCP_TRANSPORT
│   ├── server.ts                 # createServer({resolveClient}) — transport-agnostic MCP server factory
│   ├── constants.ts              # CHARACTER_LIMIT, DEFAULT_PAGE_SIZE, domain validation regex
│   ├── types.ts                  # TypeScript interfaces: Canvas API objects, FileLink, ExtractedText, ResolvedTaskFiles
│   ├── transport/
│   │   ├── types.ts              # ClientContext, ClientResolver, TransportBootstrap interface
│   │   ├── auth.ts               # bearerAuth() Express middleware (timingSafeEqual), token/domain extractors
│   │   ├── http.ts               # startHttpServer(): multi-tenant Streamable HTTP, session store, GC
│   │   └── stdio.ts              # StdioTransport wrapping existing stdio behavior
│   ├── services/
│   │   ├── canvasClient.ts       # Adapter + Factory: axios wrapper, auth injection, Link header parser
│   │   ├── canvasDownload.ts     # SSRF-hardened file download; CDN hostname allowlist; redirect re-check
│   │   ├── ocr.ts                # OcrService interface; NullOcrService; GoogleVisionOcrService; createOcrService()
│   │   ├── documentExtractor.ts  # DocumentExtractor interface; DefaultDocumentExtractor (MIME dispatcher)
│   │   ├── canvasLinks.ts        # extractFileLinks(html): parses /courses/:c/files/:f links, deduplicates
│   │   ├── errors.ts             # Result<T,E> type, ok/err constructors, mapApiError()
│   │   ├── formatters.ts         # Strategy: Formatter<T> interface, Markdown & JSON implementations
│   │   └── markdown.ts           # htmlToMarkdown() helper via turndown (used by Pages + Discussions)
│   ├── repositories/             # Repository pattern — one file per Canvas API domain
│   │   ├── courses.ts            # Phase 1
│   │   ├── assignments.ts        # Phase 1
│   │   ├── submissions.ts        # Phase 1 + online_upload extension
│   │   ├── todo.ts               # Phase 1
│   │   ├── calendar.ts           # Phase 1
│   │   ├── announcements.ts      # Phase 1
│   │   ├── profile.ts            # Phase 1
│   │   ├── modules.ts            # Phase 2
│   │   ├── pages.ts              # Phase 2
│   │   ├── discussions.ts        # Phase 2
│   │   ├── conversations.ts      # Phase 2
│   │   ├── files.ts              # Phase 2 — 3-step S3 upload, uses axios directly (not ICanvasClient)
│   │   ├── planner.ts            # Phase 2
│   │   ├── grades.ts             # Phase 2
│   │   ├── quizzes.ts            # Phase 2 (metadata) + Phase 3 (full taking flow)
│   │   └── documents.ts          # Phase 4 — listCourseFiles, downloadFileBytes, extractDocumentText, resolveTaskFiles
│   ├── schemas/
│   │   ├── common.ts             # Zod schemas: pagination, response format, domain IDs
│   │   └── documents.ts          # Phase 4 — Zod schemas for 5 document tools; ResolveTaskFilesSchema discriminated union
│   └── tools/
│       ├── index.ts              # Registry: registerAllTools(server, resolveClient: ClientResolver)
│       ├── base.ts               # Template Method: executeListTool(), executeSingleTool()
│       ├── courses.ts            # Phase 1
│       ├── assignments.ts        # Phase 1
│       ├── submissions.ts        # Phase 1 + online_upload extension
│       ├── todo.ts               # Phase 1
│       ├── calendar.ts           # Phase 1
│       ├── announcements.ts      # Phase 1
│       ├── profile.ts            # Phase 1
│       ├── modules.ts            # Phase 2
│       ├── pages.ts              # Phase 2
│       ├── discussions.ts        # Phase 2
│       ├── conversations.ts      # Phase 2
│       ├── files.ts              # Phase 2
│       ├── planner.ts            # Phase 2
│       ├── grades.ts             # Phase 2
│       ├── quizzes.ts            # Phase 2 (metadata) + Phase 3 (full taking flow)
│       └── documents.ts          # Phase 4 — canvas_list_files, canvas_get_file, canvas_download_file, canvas_extract_document_text, canvas_resolve_task_files
├── tests/
│   ├── unit/
│   │   ├── services/             # canvasClient, errors, formatters tests
│   │   ├── repositories/         # all repository unit tests
│   │   └── schemas/              # common schema validation tests
│   ├── integration/
│   │   ├── server.test.ts        # In-memory MCP client ↔ server, Phase 1 tools
│   │   ├── tools.phase2.test.ts  # In-memory MCP client ↔ server, Phase 2 tools
│   │   └── tools.quiz-flow.test.ts # In-memory MCP client ↔ server, Phase 3 quiz flow
│   ├── fixtures/                 # Canonical Canvas API JSON response shapes
│   ├── mocks/                    # MSW server + request handlers (all domains)
│   └── helpers/                  # buildTestClient(), buildInMemoryServer()
├── dist/                         # Compiled output (gitignored)
├── docs/                         # Extended documentation
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Design Patterns

The patterns below were chosen because they solve specific problems in this codebase, not for their own sake.

### Adapter — `src/services/canvasClient.ts`

**Problem:** Canvas has quirks — Link-header pagination, Bearer auth injection, 64-bit IDs, domain validation — that shouldn't leak into business logic.

**Solution:** `ICanvasClient` interface with `get`, `getPaginated`, `post`, `put`, `delete` methods. The concrete `createCanvasClient()` wraps axios and handles all HTTP details. Repositories depend on `ICanvasClient`, not on axios.

**Trade-off:** One extra abstraction layer. Worth it because tests inject a real client against MSW (no mocking internal code), and swapping HTTP libraries later is a 1-file change.

---

### Repository — `src/repositories/`

**Problem:** Without a separation layer, tools would directly compose raw HTTP paths, making each tool aware of Canvas URL conventions.

**Solution:** One class per domain (`CoursesRepository`, `AssignmentsRepository`, etc.), each taking `ICanvasClient` in the constructor. Tools call repos; repos call the client.

**Trade-off:** More files, but each file is small (30–60 lines) and has a single responsibility. Testing a repository is a 10-line test against MSW.

---

### Strategy — `src/services/formatters.ts`

**Problem:** Every list tool can return Markdown or JSON, but the formatting logic shouldn't live inside each tool handler.

**Solution:** `Formatter<T>` interface with `format(item)` and `formatList(items, total)`. Two implementations per type: `*MarkdownFormatter` and `*JsonFormatter`. Tools call `selectFormatter(format, md, json)` to pick at runtime.

**Trade-off:** More classes. Adding a third format (CSV, for example) means adding one class per type — but zero changes to tool handlers.

---

### Factory — `createCanvasClient(config)` / `createClientFromEnv()`

**Problem:** Need different clients for production (reads env vars) and tests (custom config, no env vars required).

**Solution:** `createCanvasClient(config)` builds a client from explicit config. `createClientFromEnv()` reads env vars and calls the former. Tests use `buildTestClient()` which also calls the former with test config.

---

### Template Method — `src/tools/base.ts`

**Problem:** All list tools share the same flow: fetch → check error → format → truncate → wrap in MCP response.

**Solution:** `executeListTool(fetchFn, formatter, format)` and `executeSingleTool(fetchFn, formatter)` handle the common flow. Tool handlers provide only the fetch lambda and formatter.

**Trade-off:** Slightly less flexibility per tool. In practice, all list tools needed the same flow.

---

### Registry — `src/tools/index.ts`

**Problem:** `src/index.ts` (entry point) shouldn't know about individual tool files. New domains shouldn't require changes in multiple places.

**Solution:** Each tool file exports `register(server, client)`. `registerAllTools(server, client)` in `tools/index.ts` calls each.

**Trade-off:** One `tools/index.ts` still needs updating per new domain — but that is the only place.

---

### Result / Either — `src/services/errors.ts`

**Problem:** Using thrown exceptions for expected HTTP errors (401, 404, etc.) makes error handling implicit and easy to forget.

**Solution:** `Result<T, CanvasError>` union type. `ok(value)` and `err(error)` constructors. All async operations return `Result`, never throw. Callers are forced to check `result.ok` before using the value.

**Trade-off:** More verbose call sites (`if (!result.ok) return ...`). Worth it — impossible to forget error handling.

---

### Dependency Injection (constructor injection)

**Problem:** Without DI, repositories would call `createClientFromEnv()` directly, making them untestable without env vars.

**Solution:** Repositories and tools receive `ICanvasClient` as a constructor argument. `src/index.ts` is the single composition root.

**Trade-off:** Wiring must be done explicitly in `index.ts` and in test helpers. Acceptable for this scale.

---

### Transport Strategy / `TransportBootstrap`

**Problem:** The server originally assumed a single stdio transport and a single Canvas client, making multi-tenant HTTP hosting impossible.

**Solution:** `TransportBootstrap` interface in `src/transport/types.ts` decouples server creation from transport concerns. `StdioTransport` preserves the original single-user flow; `HttpTransport` (`src/transport/http.ts`) runs a Streamable HTTP server with a per-session `Map<sessionId, {transport, context, lastSeen}>`.

`ClientResolver = (sessionId?) => ClientContext` replaces the single `ICanvasClient` DI. Every tool file now accepts `resolveClient: ClientResolver` and resolves the correct client per-request via `resolveClient(extra.sessionId)`. No tool handler needs to know which transport is active.

**Trade-off:** Tool signatures gained one parameter. Adding a new transport means implementing `TransportBootstrap` and wiring it in `src/index.ts` — zero changes to tools or repositories.

---

### Adapter — `OcrService`

**Problem:** OCR is optional (requires GCP credentials), the SDK import is large, and users without GCP credentials should not see startup errors.

**Solution:** `OcrService` interface with a `recognizeText(buffer, mimeType)` method. `NullOcrService` returns an empty result when `OCR_ENABLED=false`. `GoogleVisionOcrService` lazily imports `@google-cloud/vision` only at first call, preventing startup failure for users without the package or credentials. `createOcrService({enabled})` factory decides which implementation to instantiate.

**Trade-off:** The lazy import makes first-call latency slightly higher. Swapping Google Vision for Azure Cognitive Services means implementing `OcrService` and changing `createOcrService()` — zero impact on `DocumentExtractor` or tools.

---

### Adapter — `DocumentExtractor`

**Problem:** Tools need text from files regardless of format (PDF, DOCX, plain text, images). Each format requires a different library, and new formats will be added over time.

**Solution:** `DocumentExtractor` interface with a single `extract(buffer, mimeType)` method. `DefaultDocumentExtractor` dispatches by MIME type: `text/*` → UTF-8 decode, `application/pdf` → pdf-parse, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → mammoth, `image/*` → `OcrService`. `createDocumentExtractor({ocr})` factory wires the dependencies.

**Trade-off:** Adding a new format is one new branch (or a new Strategy class) in `DefaultDocumentExtractor`. Zero changes to tools or repositories.

---

## Data Flow

### Single-user (stdio) path

```
User asks Claude a question
        │
        ▼
Claude calls MCP tool (e.g. canvas_list_assignments)
        │
        ▼
Tool handler (src/tools/assignments.ts)
  └─ Validates input via Zod schema
  └─ resolveClient(extra.sessionId) → ICanvasClient
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

### Multi-tenant (HTTP) path

```
HTTP POST /mcp  (AI agent service)
        │
        ▼
bearerAuth middleware (src/transport/auth.ts)
  └─ Validates Authorization: Bearer <MCP_AUTH_TOKEN> via timingSafeEqual
  └─ 401 on mismatch
        │
        ▼
startHttpServer session logic (src/transport/http.ts)
  └─ initialize request: extracts X-Canvas-Token + X-Canvas-Domain
     └─ Validates token via GET /api/v1/users/self → 401 on failure
     └─ Creates session entry: Map<sessionId, {transport, context, lastSeen}>
  └─ Subsequent requests: looks up session by Mcp-Session-Id header
        │
        ▼
resolveClient(sessionId) → ClientContext { client, token, domain }
        │
        ▼
Tool handler → Repository → Canvas API  (same as stdio path from here)
        │
        ▼
GC loop: every min (or SESSION_IDLE_MS) evicts sessions idle > SESSION_IDLE_MS
```

---

## Trade-offs & Decisions

### HTTP is now the default transport

HTTP (`MCP_TRANSPORT=http`) is the default, enabling multi-tenant hosting. stdio is available via `MCP_TRANSPORT=stdio` for local single-user use (e.g. running directly under Claude Desktop).

### Multi-tenant session model — Map vs stateless JWT

Session state is kept in a `Map<sessionId, {transport, context, lastSeen}>` in memory rather than encoding identity in a stateless JWT. The reason: Canvas tokens are **opaque** — there is no way to extract user identity from the token without making a round-trip to `GET /api/v1/users/self`. Doing that round-trip on every request would double the API call count for every tool invocation. The session store pays the validation cost once (at `initialize`) and then resolves the client in O(1) for all subsequent requests. Sessions are GC'd after `SESSION_IDLE_MS` of inactivity (default 30 min).

### SSRF for file download — why a CDN allowlist instead of `*.instructure.com`

Canvas signed file URLs do not resolve to `*.instructure.com`. They point to CDN/storage backends: `inst-fs-*.inscloudgate.net` (Canvas file storage) and `instructure-uploads.s3*.amazonaws.com` / `*.s3.amazonaws.com` (S3-backed uploads). Blocking anything outside `*.instructure.com` would make `canvas_download_file` fail for the vast majority of real Canvas files. The allowlist covers exactly the set of hostnames Canvas uses in practice while still blocking arbitrary internet URLs. Each redirect re-checks the resolved hostname against the same allowlist.

### OCR lazy import — why lazy-import `@google-cloud/vision`

`@google-cloud/vision` is a large SDK that attempts to read GCP credentials at import time. Importing it at module load would cause the server to fail on startup for any user who has not configured GCP credentials, even if `OCR_ENABLED=false`. The `GoogleVisionOcrService` uses a dynamic `import()` only at first `recognizeText()` call, so startup is always clean.

### Why TypeScript and not Python?

- The MCP TypeScript SDK has better type coverage for tool registration patterns
- Static typing catches configuration errors at build time rather than runtime
- `zod` schema inference (`z.infer<typeof Schema>`) eliminates redundant type definitions

### Why Zod for validation?

Canvas API IDs are integers; tool inputs are strings/numbers from JSON. Zod provides both runtime validation and static type inference from the same definition.

### Why Result<T> instead of try/catch?

HTTP errors like 401 and 404 are **expected outcomes**, not exceptions. Modeling them as `Result<T, CanvasError>` makes them visible in the type signature and forces callers to handle them.

### File upload — why axios directly in `FilesRepository`?

Canvas file upload is a 3-step process: (1) notify Canvas → get S3 pre-signed URL, (2) POST multipart to that external S3 URL **without** Authorization header, (3) GET the confirmation URL **with** Authorization. Step 2 targets an AWS S3 endpoint — passing it through `ICanvasClient` (which always injects Bearer auth and targets `*.instructure.com`) would be architecturally wrong. `FilesRepository` uses axios directly, injected via constructor. The 3-step flow is fully encapsulated; tool handlers see a single `uploadUserFile()` call.

### Character limit (25,000)

MCP tool responses become part of the AI's context window. The 25k character soft cap truncates with a message advising the user to paginate or filter. Adjust `CHARACTER_LIMIT` in `src/constants.ts` if needed.

### Stateless `validation_token` flow (Phase 3)

Canvas issues `validation_token` **once** when a quiz attempt is created (`POST .../submissions`). It is required by the answer endpoint and the complete endpoint — but not stored server-side.

The MCP server follows its "no data persistence" principle: `validation_token` is returned in the `canvas_start_quiz_attempt` response (prominently displayed in Markdown output). The AI agent reads it from the response and passes it as a parameter to `canvas_answer_quiz_question` and `canvas_complete_quiz_attempt`. No caching, no session state.

**409 Conflict recovery:** If a quiz already has an in-progress attempt, the start attempt endpoint returns 409. `QuizzesRepository.startAttempt()` detects `error.code === "CONFLICT"`, falls back to `GET .../quizzes/:id/submission` to retrieve the existing attempt (including its `validation_token`), and returns it as a normal `Result<CanvasQuizSubmission>`. The tool handler sees no difference.

### SSRF protection for `CANVAS_DOMAIN`

Without validation, a misconfigured `CANVAS_DOMAIN=evil.com` could cause the server to send the Bearer token to an attacker-controlled server. The regex `/^[a-z0-9-]+\.instructure\.com$/i` ensures all requests go to Instructure-controlled infrastructure.

---

## Extending the Server

Adding a new Canvas domain requires **3 files** and **zero changes** to existing code:

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
import type { ClientResolver } from "../transport/types.js";

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool("canvas_list_modules", { /* ... */ }, async (params, extra) => {
    const { client } = resolveClient(extra.sessionId);
    const repo = new ModulesRepository(client);
    return executeListTool(() => repo.list(params.course_id), formatter, params.response_format);
  });
}
```

### 3. Add one line to the registry

```typescript
// src/tools/index.ts
import * as modules from "./modules.js";     // ← add this
import type { ClientResolver } from "../transport/types.js";

export function registerAllTools(server: McpServer, resolveClient: ClientResolver): void {
  // ... existing registrations
  modules.register(server, resolveClient);    // ← add this
}
```

That's it. No other files change.
