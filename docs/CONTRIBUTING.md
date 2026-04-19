# Contributing

Contributions welcome. Before opening a PR:

1. **Tests are required.** Every new feature must include unit tests for the repository and an integration test for the tool. Write failing tests first.
2. **No mocking internal code.** Use MSW for HTTP; run real production code in tests.
3. **Follow existing patterns.** New domain = new repository file + new tool file + one line in `tools/index.ts`.
4. **TypeScript strict.** No `any`, no `@ts-ignore`. All async functions have explicit return types.
5. Run `npm run build && npm test` before submitting.

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
| `integration/server` | 38 tools visible, Phase 1 tool calls return expected content | In-memory MCP client ↔ server via `InMemoryTransport` |
| `integration/tools.phase2` | Phase 2 tool calls: modules, pages, discussions, conversations, planner, grades, quizzes | In-memory MCP client ↔ server via `InMemoryTransport` |
| `integration/tools.quiz-flow` | Phase 3 quiz-taking flow: list questions, start/recover attempt, answer (multi-type), complete, submissions, time left | In-memory MCP client ↔ server via `InMemoryTransport` |

**152 tests, 17 test files, ~3.8s total runtime.**

### Key principle: never mock internal code

Tests use [MSW](https://mswjs.io/) to intercept HTTP at the network boundary. Repositories, formatters, error handlers — all run as real production code against the mock API. This means a bug in a repository is caught by the test, not hidden behind a mock.

---

## Adding a new domain

1. Add fixture JSON in `tests/fixtures/<domain>.list.json` (real Canvas API response shape)
2. Add MSW handlers in `tests/mocks/handlers.ts`
3. Write `tests/unit/repositories/<domain>.test.ts`
4. Write `tests/integration/tools.<domain>.test.ts`
5. Implement `src/repositories/<domain>.ts` and `src/tools/<domain>.ts`
6. Register in `src/tools/index.ts`

See [ARCHITECTURE.md](ARCHITECTURE.md#extending-the-server) for full code examples.
