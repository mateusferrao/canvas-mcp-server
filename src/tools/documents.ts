import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DocumentsRepository } from "../repositories/documents.js";
import { createDocumentExtractor } from "../services/documentExtractor.js";
import { createOcrService } from "../services/ocr.js";
import {
  FileMarkdownFormatter,
  FileJsonFormatter,
  ExtractedTextMarkdownFormatter,
  ExtractedTextJsonFormatter,
  ResolvedTaskFilesMarkdownFormatter,
  ResolvedTaskFilesJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import {
  ListFilesSchema,
  GetFileSchema,
  DownloadFileSchema,
  ExtractDocumentTextSchema,
  ResolveTaskFilesSchema,
} from "../schemas/documents.js";
import { executeListTool, executeSingleTool } from "./base.js";
import { formatError } from "../services/errors.js";
import type { ClientResolver } from "../transport/types.js";

// ── Stateless formatters (module-level — safe across sessions) ─────────────────
const fileMdFmt = new FileMarkdownFormatter();
const fileJsonFmt = new FileJsonFormatter();
const extractMdFmt = new ExtractedTextMarkdownFormatter();
const extractJsonFmt = new ExtractedTextJsonFormatter();
const tasksMdFmt = new ResolvedTaskFilesMarkdownFormatter();
const tasksJsonFmt = new ResolvedTaskFilesJsonFormatter();

// ── OCR / extractor (singleton — stateless services) ──────────────────────────
const ocrService = createOcrService({
  enabled: process.env["OCR_ENABLED"] !== "false",
});
const extractor = createDocumentExtractor({ ocr: ocrService });

export function register(server: McpServer, resolveClient: ClientResolver): void {
  // ── canvas_list_files ───────────────────────────────────────────────────────
  server.registerTool(
    "canvas_list_files",
    {
      title: "Listar Arquivos do Curso",
      description: `Lista arquivos de um curso no Canvas LMS.

Args:
  - course_id: ID do curso (obrigatório)
  - content_types: filtrar por MIME (ex: ['application/pdf'])
  - search_term: busca por nome
  - sort: "name" | "created_at" | "updated_at" | "content_type" | "user"
  - order: "asc" | "desc"
  - per_page: 1-100 (default: 25)
  - page: número da página (default: 1)
  - response_format: "markdown" | "json"

Retorna: lista de arquivos com metadados (nome, tipo, tamanho, URL de download).`,
      inputSchema: ListFilesSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new DocumentsRepository(client, extractor);
      const fmt = selectFormatter(params.response_format, fileMdFmt, fileJsonFmt);

      return executeListTool(
        () =>
          repo.listCourseFiles(params.course_id, {
            per_page: params.per_page,
            page: params.page,
            content_types: params.content_types,
            search_term: params.search_term,
            sort: params.sort,
            order: params.order,
          }),
        fmt,
        params.response_format
      );
    }
  );

  // ── canvas_get_file ─────────────────────────────────────────────────────────
  server.registerTool(
    "canvas_get_file",
    {
      title: "Obter Metadados de Arquivo",
      description: `Obtém metadados de um arquivo no Canvas LMS pelo ID.

Args:
  - file_id: ID do arquivo (obrigatório)
  - response_format: "markdown" | "json"

Retorna: metadados completos (nome, tipo, tamanho, URL de download, datas).`,
      inputSchema: GetFileSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new DocumentsRepository(client, extractor);
      const fmt = selectFormatter(params.response_format, fileMdFmt, fileJsonFmt);

      return executeSingleTool(() => repo.getFileMetadata(params.file_id), fmt);
    }
  );

  // ── canvas_download_file ────────────────────────────────────────────────────
  server.registerTool(
    "canvas_download_file",
    {
      title: "Baixar Arquivo Canvas",
      description: `Baixa o conteúdo binário de um arquivo Canvas e retorna em Base64.

Args:
  - file_id: ID do arquivo (obrigatório)

Retorna: conteúdo em Base64 + content-type + tamanho em bytes.

⚠️ Use canvas_extract_document_text para ler texto de PDF/DOCX/imagem.
Este tool retorna bytes brutos — adequado para arquivos binários ou quando
o agente precisa do conteúdo original.`,
      inputSchema: DownloadFileSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new DocumentsRepository(client, extractor);

      const result = await repo.downloadFileBytes(params.file_id);
      if (!result.ok) {
        return { content: [{ type: "text" as const, text: formatError(result.error) }] };
      }

      const { base64, contentType, filename, size } = result.value;
      const meta = [
        `**Arquivo**: ${filename ?? `ID ${params.file_id}`}`,
        `**Tipo**: ${contentType}`,
        `**Tamanho**: ${(size / 1024).toFixed(1)} KB`,
        `**Base64** (${base64.length} chars):`,
        "",
        base64,
      ].join("\n");

      return {
        content: [{ type: "text" as const, text: meta }],
        structuredContent: { fileId: params.file_id, filename, contentType, size, base64 },
      };
    }
  );

  // ── canvas_extract_document_text ────────────────────────────────────────────
  server.registerTool(
    "canvas_extract_document_text",
    {
      title: "Extrair Texto de Documento",
      description: `Baixa e extrai texto de um arquivo Canvas.

Formatos suportados:
  - Texto plano (txt, csv, json, html, etc.) → decodificação UTF-8
  - PDF → extração via pdf-parse
  - Word (docx/doc) → extração via mammoth
  - Imagens (jpg, png, gif, webp, etc.) → OCR via Google Cloud Vision

Args:
  - file_id: ID do arquivo no Canvas (obrigatório)
  - response_format: "markdown" | "json"

Retorna: texto extraído + método usado + número de páginas (PDF) + flag de truncamento.`,
      inputSchema: ExtractDocumentTextSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new DocumentsRepository(client, extractor);

      const result = await repo.extractDocumentText(params.file_id);
      if (!result.ok) {
        return { content: [{ type: "text" as const, text: formatError(result.error) }] };
      }

      const { extraction, filename, contentType, size } = result.value;
      const fmt = selectFormatter(params.response_format, extractMdFmt, extractJsonFmt);
      const header = [
        `**Arquivo**: ${filename ?? `ID ${params.file_id}`}`,
        `**Tipo**: ${contentType}`,
        `**Tamanho**: ${(size / 1024).toFixed(1)} KB`,
        "",
      ].join("\n");

      return {
        content: [{ type: "text" as const, text: header + fmt.format(extraction) }],
        structuredContent: { fileId: params.file_id, filename, contentType, size, extraction } as unknown as Record<string, unknown>,
      };
    }
  );

  // ── canvas_resolve_task_files ───────────────────────────────────────────────
  server.registerTool(
    "canvas_resolve_task_files",
    {
      title: "Resolver Arquivos de Tarefa",
      description: `Encontra e extrai texto de todos os arquivos anexados à descrição de uma tarefa, página ou discussão.

Como funciona:
  1. Busca o HTML da entidade (assignment/page/discussion)
  2. Extrai links Canvas (/files/:id) da descrição
  3. Para cada arquivo: baixa + extrai texto (PDF/DOCX/imagem/texto)
  4. Retorna todos os textos consolidados

Ideal para: "leia os arquivos dessa tarefa", "o que diz o PDF anexado?"

Args:
  - kind: "assignment" | "page" | "discussion"
  - course_id: ID do curso
  - id: ID da entidade (tarefa / página / tópico)
  - response_format: "markdown" | "json"

Retorna: texto de cada arquivo + metadados + erros individuais (se algum falhar).`,
      inputSchema: ResolveTaskFilesSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new DocumentsRepository(client, extractor);
      const fmt = selectFormatter(params.response_format, tasksMdFmt, tasksJsonFmt);

      const result = await repo.resolveTaskFiles({
        kind: params.kind,
        courseId: params.course_id,
        id: params.id,
      });

      if (!result.ok) {
        return { content: [{ type: "text" as const, text: formatError(result.error) }] };
      }

      return {
        content: [{ type: "text" as const, text: fmt.format(result.value) }],
        structuredContent: result.value as unknown as Record<string, unknown>,
      };
    }
  );
}
