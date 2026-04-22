# Architecture

## Overview

The server is organized around a strict separation of concerns:

- Transport layer: HTTP (default) and stdio
- Tool layer: fixed surface of 10 MCP tools
- Dispatcher layer: kind/action routing for consolidated tools
- Repository layer: Canvas API domain access
- Service layer: formatting, extraction, OCR, error mapping

The refactor goal was to reduce LLM tool selection complexity while preserving existing domain behavior.

## Tool Surface (Hard-Cut)

Exactly 10 tools are registered in [src/tools/index.ts](../src/tools/index.ts):

- `canvas_list`
- `canvas_get`
- `canvas_document`
- `canvas_quiz_attempt`
- `canvas_submit_assignment`
- `canvas_mark_module_item_done`
- `canvas_post_discussion_entry`
- `canvas_send_message`
- `canvas_manage_planner_note`
- `canvas_upload_file`

There are no compatibility aliases for removed legacy tools.

## Consolidation Strategy

### 1) Discriminated unions at schema boundary

Primary contracts are declared in [src/schemas/consolidated.ts](../src/schemas/consolidated.ts):

- `CanvasListInputSchema` (discriminant: `kind`)
- `CanvasGetInputSchema` (discriminant: `kind`)
- `CanvasDocumentInputSchema` (discriminant: `action`)
- `CanvasQuizAttemptInputSchema` (union for `start`/`answer`/`complete`)
- standalone write schemas

This keeps validation explicit and rejects unsupported branches early.

### 2) Dispatcher registry per consolidated read tool

- [src/tools/dispatchers/listDispatcher.ts](../src/tools/dispatchers/listDispatcher.ts)
- [src/tools/dispatchers/getDispatcher.ts](../src/tools/dispatchers/getDispatcher.ts)

Each dispatcher maintains a registry:

- typed schema per kind
- fetch/execute function
- markdown/json formatter pair

Flow:

1. Parse consolidated input
2. Validate discriminant (`kind`)
3. Re-parse with branch schema
4. Resolve repository call
5. Format response and return MCP payload

### 3) Consolidated tool wrappers stay thin

- [src/tools/consolidated/list.ts](../src/tools/consolidated/list.ts)
- [src/tools/consolidated/get.ts](../src/tools/consolidated/get.ts)
- [src/tools/consolidated/document.ts](../src/tools/consolidated/document.ts)
- [src/tools/consolidated/quizAttempt.ts](../src/tools/consolidated/quizAttempt.ts)

These wrappers only:

- register MCP tool metadata
- parse input
- delegate to dispatchers/repositories

## Runtime and Transport

### HTTP mode (default)

- Entry: [src/index.ts](../src/index.ts)
- HTTP transport: [src/transport/http.ts](../src/transport/http.ts)

Key behavior:

- `/mcp` protected by `MCP_AUTH_TOKEN`
- Canvas user binding done at `initialize` via `X-Canvas-Token`
- In-memory per-session `ClientContext`
- `/healthz` unauthenticated liveness endpoint
- graceful shutdown on `SIGTERM` and `SIGINT`

### stdio mode

- Same tool/repository stack
- Single-user token from environment

## Layer responsibilities

### Repositories

Repositories keep Canvas endpoint details isolated.

Examples:

- [src/repositories/todo.ts](../src/repositories/todo.ts): paginated todo/upcoming/missing
- [src/repositories/quizzes.ts](../src/repositories/quizzes.ts): quiz metadata + attempt workflow
- [src/repositories/documents.ts](../src/repositories/documents.ts): list/download/extract/resolve task files

### Services

- [src/services/formatters.ts](../src/services/formatters.ts): markdown/json strategies
- [src/services/errors.ts](../src/services/errors.ts): `Result<T, E>` and mapped errors
- [src/services/documentExtractor.ts](../src/services/documentExtractor.ts): format-aware extraction
- [src/services/ocr.ts](../src/services/ocr.ts): optional OCR backend

### Tool base helpers

- [src/tools/base.ts](../src/tools/base.ts): normalized list/single MCP response flow

## Extending consolidated kinds

To add a new read/list capability under consolidation:

1. Add schema branch in [src/schemas/consolidated.ts](../src/schemas/consolidated.ts)
2. Add dispatcher registry entry (`listDispatcher` or `getDispatcher`)
3. Reuse existing repository or add repository method
4. Add/adjust formatter if output shape is new
5. Add unit tests for dispatcher and integration tests for tool call

No tool registration changes are needed unless introducing a brand-new top-level tool.

## Testing strategy

Coverage is split by intent:

- Unit tests for dispatchers
  - [tests/unit/tools/dispatchers/listDispatcher.test.ts](../tests/unit/tools/dispatchers/listDispatcher.test.ts)
  - [tests/unit/tools/dispatchers/getDispatcher.test.ts](../tests/unit/tools/dispatchers/getDispatcher.test.ts)
- Integration tests for MCP behavior
  - [tests/integration/server.test.ts](../tests/integration/server.test.ts)
  - [tests/integration/tools.phase2.test.ts](../tests/integration/tools.phase2.test.ts)
  - [tests/integration/tools.quiz-flow.test.ts](../tests/integration/tools.quiz-flow.test.ts)
  - [tests/integration/tools.consolidated.test.ts](../tests/integration/tools.consolidated.test.ts)

Mocked Canvas transport is provided through MSW handlers in [tests/mocks/handlers.ts](../tests/mocks/handlers.ts).

## Design constraints preserved

The consolidation keeps original engineering constraints:

- strict TypeScript without `any` shortcuts
- `Result<T, E>`-first flow for operational errors
- dependency injection via `ClientResolver`
- no persistence of Canvas credentials in storage
- test-first and mock-driven validation approach
