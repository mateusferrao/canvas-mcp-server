# Plano: HTTP transport + Document flow (OCR)

## Context

MCP server hoje é stdio-only (local subprocess p/ Claude Desktop). Usuário tem agente de IA próprio que atenderá **múltiplos usuários finais**, cada um com seu próprio token Canvas. Transport precisa virar HTTP **e** MCP precisa virar multi-tenant stateless (token Canvas por request, não do env).

**Modo híbrido:**
- **stdio** = single-tenant via `CANVAS_API_TOKEN` env (dev local do dono)
- **http** = multi-tenant; token Canvas injetado por sessão via header `X-Canvas-Token`; MCP em si autenticado por `MCP_AUTH_TOKEN` bearer (prova que caller = serviço de agente, não rando)

Segundo gap: Canvas tem `canvas_upload_file` mas nada de download/leitura. Descrições de tarefa frequentemente têm `<a href=".../files/:id">` embutidos em HTML — agente não consegue ler arquivo anexado. Precisa pipeline: download → extrair texto (txt direto, pdf via `pdf-parse`, docx via `mammoth`, imagem via **Google Cloud Vision** `documentTextDetection`).

Projeto: TypeScript strict, `@modelcontextprotocol/sdk ^1.6.1`, 38 tools, 152 tests passando. Padrões: Repository + Formatter<T> + `Result<T,E>` + DI via `ICanvasClient` + MSW fixtures. Root: `C:\Users\mateu\OneDrive\Área de Trabalho\PUC\Canvas MCP\canvas-mcp-server`.

Final: ~43 tools, dois transportes (http default, stdio opcional), 5 novas tools de documento.

---

## Princípios arquiteturais (obrigatórios em todo código novo)

Seguir padrões existentes do projeto. Qualquer desvio = justificar no PR.

- **TDD**: escrever teste ANTES da impl. Red → Green → Refactor. Nenhum arquivo novo sem suite correspondente.
- **Repository pattern**: 1 repo por domínio Canvas. Constructor recebe `ICanvasClient` via DI. Métodos retornam `Result<T, CanvasError>`. Sem lógica de formatação/transport.
- **Strategy (Formatter<T>)**: par markdown+json por tipo novo. Implementam interface comum `Formatter<T>`.
- **Factory**: construção de client (`createClientFromEnv`, `createClientFromToken`), OCR (`createOcrService({enabled, creds})`), document extractor (`createExtractor({ocr})`). Nunca `new` direto em handler/tool.
- **Adapter**: `ICanvasClient` esconde axios; `OcrService` esconde Google Vision SDK; `DocumentExtractor` esconde libs de parsing (pdf-parse/mammoth). Troca de lib sem tocar tool/repo.
- **Template Method**: reusar `executeListTool`/`executeSingleTool` de `src/tools/base.ts` p/ reads. Custom handlers só p/ writes.
- **Dependency Injection**: zero singleton. Zero `new X()` dentro de tool body capturando módulo-level. Tudo via constructor ou parâmetro.
- **Result<T,E>**: erros esperados (404, 401, invalid_input, unsupported_format, ocr_disabled) via `Result`. Exceptions só p/ bugs (programmer error).
- **Discriminated unions (Zod)**: inputs polimórficos (ex: `resolve_task_files` kind). Runtime validation = compile-time typing.
- **Modularidade**: 1 arquivo = 1 responsabilidade. `canvasDownload` ≠ `documentExtractor` ≠ `ocr` ≠ `canvasLinks`. Cada um testável isolado.
- **Extensibilidade**:
  - Novo formato de doc? Registrar no dispatcher `documentExtractor` sem tocar em tools.
  - Novo provedor OCR (Azure/AWS Textract)? Implementar `OcrService` interface; factory escolhe por env. Zero impacto em extractor.
  - Novo transport? Implementar `TransportBootstrap` interface; `index.ts` roteia.
- **Fechado p/ modificação, aberto p/ extensão (OCP)**: interfaces estáveis, impls plugáveis.
- **No `any`, no `@ts-ignore`**, strict TS clean.
- **Logs estruturados**: nunca concatenar token/PII. Redact helper central.
- **No persistence**: zero `fs.writeFile`/DB em runtime (exceto logs). Memória only.

### Interfaces novas a definir antes de impl

```ts
interface OcrService {
  extractText(bytes: Buffer, mime: string): Promise<Result<{ text: string }, OcrError>>;
}

interface DocumentExtractor {
  extract(bytes: Buffer, contentType: string, filename?: string):
    Promise<Result<ExtractedText, DocumentError>>;
}

interface TransportBootstrap {
  start(deps: { resolveClient: ClientResolver }): Promise<void>;
  stop(): Promise<void>;
}

type ClientResolver = (extra: RequestHandlerExtra) => ICanvasClient;
```

---

## Change 1 — Streamable HTTP transport + multi-tenant (modo http)

### Refactor DI (pré-requisito)

Todos os tools hoje capturam `client` em closure no `registerTool`. Em multi-tenant isso **não funciona** — client precisa ser resolvido por request.

- `src/services/canvasClient.ts` — expor `createClientFromToken(token, domain)` (factory pública). Manter `createClientFromEnv()` p/ stdio.
- `src/server.ts` — `createServer({resolveClient})` onde `resolveClient: (extra: RequestHandlerExtra) => ICanvasClient`. Em stdio: retorna sempre client único do env. Em http: lê do session store pelo `sessionId` do `extra`.
- `src/tools/*.ts` — migrar padrão. Ao invés de `const repo = new XRepo(client)` no escopo do `register(server, client)`, fazer dentro do handler: `const client = resolveClient(extra); const repo = new XRepo(client);`. Repos são leves (só guardam ref), ok recriar por call. Alternativa mais limpa: `AsyncLocalStorage` p/ contexto de request.
- Tests: `buildTestServer(mockClient)` passa `resolveClient = () => mockClient`. Fixtures MSW intactas.

### Criar

- `src/server.ts` — factory `createServer({resolveClient})` devolvendo `McpServer` configurado. Puro; sem coupling c/ transport.
- `src/transport/stdio.ts` — bootstrap stdio: lê env, cria 1 client, `resolveClient = () => singleton`.
- `src/transport/http.ts` — `startHttpServer({port, host, authToken, allowedOrigins})`:
  - Express app, mount `POST /mcp` + `GET /mcp` + `DELETE /mcp`
  - Session store: `Map<sessionId, {transport, canvasClient, lastSeen}>`, GC idle
  - No `initialize`: extrai `X-Canvas-Token` + `X-Canvas-Domain` (opcional; default pucminas), cria `canvasClient` dedicado, **valida c/ `GET /users/self`** (rejeita 401 imediato), associa ao `sessionId` (`randomUUID()` no header `Mcp-Session-Id`)
  - `resolveClient(extra) = sessions.get(extra.sessionId).canvasClient`
- `src/transport/auth.ts` — middleware bearer MCP: compara `Authorization: Bearer <MCP_AUTH_TOKEN>` com `crypto.timingSafeEqual`; 401; NUNCA loga header.
- `src/transport/canvasTokenAuth.ts` — middleware que extrai `X-Canvas-Token` apenas em requests `initialize` (outras requests já têm sessão). 400 se ausente; redact em logs.
- `src/transport/cors.ts` — `cors` pkg + valida `Origin` contra `MCP_ALLOWED_ORIGINS` (DNS rebinding guard, spec MCP).
- `tests/integration/http-transport.test.ts`:
  - server em port 0, SDK `Client` + `StreamableHTTPClientTransport`
  - assert `listTools()` count com token válido
  - assert 401 sem MCP bearer
  - assert 400 sem `X-Canvas-Token` no initialize
  - assert sessões diferentes → clients Canvas diferentes (multi-tenancy real)

### Modificar

- `src/index.ts` — lê `MCP_TRANSPORT` (default `http`); dispatch stdio/http; falha clara se `MCP_AUTH_TOKEN` ausente em modo http; em stdio exige `CANVAS_API_TOKEN`.
- `src/constants.ts` — `DEFAULT_HTTP_PORT=3000`, `DEFAULT_HTTP_HOST='127.0.0.1'`.
- **Todos** `src/tools/*.ts` (14 arquivos) — refactor captura→lookup (ver "Refactor DI" acima). Sem mudança de comportamento, só wire.

---

## Change 2 — Document flow + OCR

### Criar

- `src/services/canvasDownload.ts` — `downloadFile(url, {maxBytes})`. **SSRF-hardened**: reusa sanitizer do `canvasClient` + allowlist hostnames Canvas CDN:
  - `/\.instructure-uploads\.s3[.-][a-z0-9-]+\.amazonaws\.com$/`
  - `/^inst-fs-[a-z0-9-]+\.inscloudgate\.net$/`
  - `/\.instructure\.com$/`
  - Max redirects 3, re-check por redirect, pre-check `content-length`, abort streaming acima de limite.
- `src/services/ocr.ts` — `OcrService` interface + `GoogleVisionOcrService` (`@google-cloud/vision` `ImageAnnotatorClient.documentTextDetection`). Suporta service-account (default via `GOOGLE_APPLICATION_CREDENTIALS`) e API key fallback. `NullOcrService` se `OCR_ENABLED=false`. **Lazy import** do `@google-cloud/vision` p/ não quebrar startup sem creds.
- `src/services/documentExtractor.ts` — `extractText(bytes, contentType, filename): Promise<Result<{text, pages?, method}, DocumentError>>`. Dispatch:
  - `text/*` → utf-8 decode
  - `application/pdf` → `pdf-parse`
  - docx MIME → `mammoth.extractRawText`
  - `image/*` → `OcrService`
  - Unknown → `err('unsupported_format')`
- `src/services/canvasLinks.ts` — `extractFileLinks(html, {defaultCourseId?})`. `node-html-parser`; matcha:
  - `<a href="/courses/:c/files/:f">`, `/files/:f`, `/files/:f/download`
  - `data-api-endpoint` + `data-api-returntype="File"` (marcadores canônicos Canvas)
  - Dedup por fileId.
- `src/repositories/documents.ts` — orquestra:
  - `getFileMetadata(fileId)`, `listCourseFiles(courseId, opts)`
  - `downloadFileBytes(fileId)` (fetch metadata → usa `url` signed)
  - `extractDocumentText(fileId)` (download → dispatcher)
  - `resolveTaskFiles({kind: 'assignment'|'page'|'discussion', courseId, id})`: busca HTML da entidade → `canvasLinks` → paralelo com concurrency=3 → map fileId→texto.
- `src/tools/documents.ts` — 5 tools:
  1. `canvas_list_files` (readOnly)
  2. `canvas_get_file` (readOnly, metadata)
  3. `canvas_download_file` (readOnly; base64 + contentType; cap `DOCUMENT_DOWNLOAD_MAX_BYTES`)
  4. `canvas_extract_document_text` (readOnly; dispatcher)
  5. `canvas_resolve_task_files` (readOnly; HTML link resolution + extract)
  Usa `executeListTool`/`executeSingleTool` de `src/tools/base.ts`.
- `src/schemas/documents.ts` — Zod inputs; `resolve_task_files` usa `z.discriminatedUnion("kind", [...])`.
- Tests (MSW fixtures):
  - `tests/unit/services/canvasLinks.test.ts` — HTML edge cases (relativo, absoluto, data-attrs, malformado)
  - `tests/unit/services/documentExtractor.test.ts` — dispatch + size limits (OCR mockado)
  - `tests/unit/services/canvasDownload.test.ts` — SSRF allowlist, size cap, redirects
  - `tests/integration/tools/documents.test.ts` — 5 tools end-to-end
  - Fixtures: `tests/fixtures/files.list.json`, `file.metadata.json`, `file.download.txt`, PDF/DOCX/PNG pequenos p/ extractor.

### Modificar

- `src/types.ts` — estender `CanvasFile` (`mime_class`, `locked`, `hidden`); add `DocumentError`, `FileLink`, `ExtractedText`.
- `src/services/formatters.ts` — `FileListFormatter`, `ExtractedTextFormatter`, `TaskFilesFormatter` (markdown + json).
- `src/services/canvasClient.ts` — exportar helpers sanitizer (`isPrivateAddress`, `resolveAndCheck`) p/ reuso em `canvasDownload.ts`.
- `src/tools/files.ts` — manter como "Canvas file CRUD puro" (upload atual). **Decisão: tudo novo em `documents.ts`**, `files.ts` intocado.
- `src/tools/index.ts` — registrar 5 tools novas; bump count esperado.

---

## Novas env vars

| Var | Obrigatória | Default | Propósito |
|---|---|---|---|
| `MCP_TRANSPORT` | não | `http` | `http` ou `stdio` |
| `MCP_HTTP_PORT` | não | `3000` | porta listen |
| `MCP_HTTP_HOST` | não | `127.0.0.1` | bind (loopback = seguro) |
| `MCP_AUTH_TOKEN` | sim (se http) | — | Bearer do serviço de agente |
| `CANVAS_API_TOKEN` | sim (se stdio) | — | Fallback single-tenant modo stdio |
| `SESSION_IDLE_MS` | não | `1800000` | GC sessão idle (30min) |
| `MCP_ALLOWED_ORIGINS` | não | vazio | CSV; valida `Origin` |
| `GOOGLE_APPLICATION_CREDENTIALS` | condicional | — | caminho JSON service-account |
| `GOOGLE_VISION_API_KEY` | condicional | — | auth fallback |
| `OCR_ENABLED` | não | `true` | master switch |
| `OCR_MAX_BYTES` | não | `10485760` | 10 MB |
| `DOCUMENT_DOWNLOAD_MAX_BYTES` | não | `26214400` | 25 MB |

---

## Novas dependências

- `express` + `@types/express` — host HTTP
- `cors` + `@types/cors` — origin allowlist
- `@google-cloud/vision` — OCR (`documentTextDetection` — melhor que `textDetection` p/ texto denso)
- `pdf-parse` + `@types/pdf-parse` — PDF → texto (sem bindings nativos)
- `mammoth` — docx → texto
- `node-html-parser` — DOM parsing leve p/ extração de links

Dev: zero extra (SDK já traz `StreamableHTTPClientTransport`).

---

## Segurança (checklist)

- Bearer MCP middleware ANTES do handler `/mcp`; `timingSafeEqual`; token nunca logado.
- `X-Canvas-Token` redact em TODOS os logs (middleware de logging filtra headers sensíveis).
- Canvas token validado uma vez no `initialize` via `GET /users/self`; 401 devolve erro claro ao agente ("invalid canvas token for user").
- Canvas token vive só em memória, na session map. Zero persistência. GC idle apaga client + token.
- Rate limit opcional por hash(`X-Canvas-Token`) p/ evitar 1 user queimar quota Canvas da instituição.
- Default bind `127.0.0.1`; README avisa sobre `0.0.0.0` → reverse proxy + TLS.
- CORS explicit allowlist + validação `Origin` (DNS rebinding guard, recomendação spec).
- `Mcp-Session-Id` = UUIDv4; rejeita não-map; GC idle.
- SSRF file download: reusa DNS check + allowlist CDN + max-redirects=3 + re-check por redirect + `content-length` cap + streamed abort.
- OCR: zero bytes p/ Google se `OCR_ENABLED=false`; redact path de creds dos logs.
- `canvas_download_file` payload clamp.
- Erros de signed-URL NÃO vazam URL de volta ao client.
- Zero `fs.writeFile` nos novos paths (princípio "No data persistence" preservado — tudo em memória).

---

## Migration & back-compat

- `MCP_TRANSPORT=stdio` mantém modo antigo funcional.
- Testes integration existentes instanciam `McpServer` direto via `createServer()` — não tocam transport, seguem passando.
- Ordem de registro de tools preservada (snapshots dependem).
- Extensão de `CanvasFile` é aditiva (optional) — fixtures existentes intactas.
- Startup limpo sem GCP creds se `OCR_ENABLED=false`.

---

## Docs updates

- `README.md`:
  - Badge tools `38` → `43`
  - Seção "Running" nova: HTTP vs stdio, tabela env vars, curl smoke
  - Security defaults (loopback, bearer)
  - Roadmap Phase 4: marcar `[x] File management` + `[x] Document OCR`
- `docs/ARCHITECTURE.md`:
  - Seção **HTTP Transport** (session lifecycle, auth middleware chain, CORS/origin, SSRF boundary)
  - Seção **Document Flow** (download → dispatcher → extractor/OCR; pipeline de `resolve_task_files`)
- `docs/TOOLS.md` — seção "Documents" com as 5 tools + exemplo end-to-end (prompt "lê os arquivos dessa tarefa" → `resolve_task_files`).
- `docs/SETUP_GCP_VISION.md` (novo) — passo a passo GCP: project → enable Vision API → service account → JSON key → env.
- `docs/SECURITY.md` (novo ou amend) — threat model: bearer, DNS rebinding, SSRF Canvas CDN, token redaction.

---

## Verificação

```bash
npm run build                   # strict TS, zero any
npm run test:unit               # novas suites verdes
npm run test:integration        # existentes + documents + http smoke
```

Manual HTTP smoke:
```bash
MCP_AUTH_TOKEN=dev-xxx MCP_TRANSPORT=http npm start

# init
curl -i -X POST localhost:3000/mcp \
  -H 'Authorization: Bearer dev-xxx' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
# esperar: 200 + header Mcp-Session-Id

# 401 sem auth
curl -i -X POST localhost:3000/mcp -H 'Content-Type: application/json' -d '{}'
```

MCP Inspector: conectar via Streamable HTTP → `canvas_list_files` → `canvas_extract_document_text` em PDF conhecido → mesmo em imagem (valida Vision) → `canvas_resolve_task_files` em assignment com anexo (valida parsing HTML + consolidação).

### Critérios de aceite
- [ ] 43 tools em `listTools()`
- [ ] HTTP server aceita bearer, rejeita 401 sem
- [ ] Stdio ainda funciona via `MCP_TRANSPORT=stdio` (single-tenant, `CANVAS_API_TOKEN` env)
- [ ] HTTP: duas sessões c/ tokens Canvas diferentes NÃO compartilham dados (teste integration c/ 2 mocks MSW distintos)
- [ ] `initialize` sem `X-Canvas-Token` → 400 claro
- [ ] Canvas token inválido → 401 no initialize (não no primeiro tool call)
- [ ] PDF/DOCX/TXT/imagem extraem texto (OCR real em 1 smoke manual)
- [ ] `resolve_task_files` encontra anexos em HTML de assignment
- [ ] SSRF: download bloqueia host fora do allowlist
- [ ] Token nunca em logs
- [ ] Sem `any`, sem `@ts-ignore`, strict clean
- [ ] README + ARCHITECTURE + TOOLS + SETUP_GCP_VISION + SECURITY atualizados

---

## Próximos passos do usuário (pós-implementação)

1. **GCP**:
   - Console → criar projeto
   - Enable *Cloud Vision API*
   - IAM → criar service account `canvas-mcp-ocr` → role *Cloud Vision AI User*
   - Gerar JSON key → salvar em `C:\Users\mateu\.secrets\canvas-mcp-vision.json`
   - `GOOGLE_APPLICATION_CREDENTIALS` = esse path
2. **Gerar auth token**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Paste em `MCP_AUTH_TOKEN`.
3. **.env do projeto**:
   ```
   MCP_TRANSPORT=http
   MCP_HTTP_PORT=3000
   MCP_HTTP_HOST=127.0.0.1
   MCP_AUTH_TOKEN=<hex>
   CANVAS_API_TOKEN=...
   CANVAS_DOMAIN=pucminas.instructure.com
   GOOGLE_APPLICATION_CREDENTIALS=C:\Users\mateu\.secrets\canvas-mcp-vision.json
   OCR_ENABLED=true
   ```
4. **Firewall/rede**:
   - Agente local mesma máquina → mantém `127.0.0.1` (nada a fazer)
   - Agente remoto → reverse proxy (Caddy/nginx) com TLS + IP allowlist; bind fica `127.0.0.1`, proxy forwarda. **NÃO** bind `0.0.0.0` direto sem TLS.
5. **Config no seu agente (multi-tenant)**:
   - Endpoint: `http://127.0.0.1:3000/mcp` (ou URL proxy TLS)
   - Headers por request `initialize`:
     - `Authorization: Bearer <MCP_AUTH_TOKEN>` (fixo, do serviço)
     - `X-Canvas-Token: <token_do_user_final>` (dinâmico, por user)
     - `X-Canvas-Domain: <dominio>` (opcional; default `pucminas.instructure.com`)
   - Requests subsequentes da mesma sessão só precisam do bearer + `Mcp-Session-Id` (token Canvas já bound à sessão)
   - Transport: Streamable HTTP
   - Uma sessão MCP por user final; não reusar sessão entre users
6. **Cost guard Vision**: `documentTextDetection` ~$1.50/1000 imagens. Deixa `OCR_MAX_BYTES` baixo em teste; monitora no GCP Billing.
7. **Smoke**: `npm run build && npm start`, testa curl init acima, depois conecta teu agente.