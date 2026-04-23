import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ExtractedTextJsonFormatter,
  ExtractedTextMarkdownFormatter,
  ResolvedTaskFilesJsonFormatter,
  ResolvedTaskFilesMarkdownFormatter,
  selectFormatter,
} from "../../services/formatters.js";
import { formatError } from "../../services/errors.js";
import { CanvasDocumentInputSchema } from "../../schemas/consolidated.js";
import type { ClientResolver } from "../../transport/types.js";
import { buildDocumentsRepository } from "./documentServices.js";

const extractMdFmt = new ExtractedTextMarkdownFormatter();
const extractJsonFmt = new ExtractedTextJsonFormatter();
const tasksMdFmt = new ResolvedTaskFilesMarkdownFormatter();
const tasksJsonFmt = new ResolvedTaskFilesJsonFormatter();

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_document",
    {
      title: "Documentos Canvas (Consolidado)",
      description: `Operações de documentos em uma única tool.

Actions:
- download: baixa bytes em base64
- extract: extrai texto de documento (TXT/PDF/DOCX/imagem OCR)
- resolve_task_files: encontra e extrai textos de arquivos anexados em assignment/page/discussion`,
      inputSchema: CanvasDocumentInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const parsed = CanvasDocumentInputSchema.parse(params);
      const { client } = resolveClient(extra.sessionId);
      const repo = buildDocumentsRepository(client);

      if (parsed.action === "download") {
        const result = await repo.downloadFileBytes(parsed.file_id);
        if (!result.ok) {
          return { content: [{ type: "text", text: formatError(result.error) }] };
        }

        const { base64, contentType, filename, size } = result.value;
        const text = [
          `**Arquivo**: ${filename ?? `ID ${parsed.file_id}`}`,
          `**Tipo**: ${contentType}`,
          `**Tamanho**: ${(size / 1024).toFixed(1)} KB`,
          `**Base64** (${base64.length} chars):`,
          "",
          base64,
        ].join("\n");

        return {
          content: [{ type: "text", text }],
          structuredContent: {
            fileId: parsed.file_id,
            filename,
            contentType,
            size,
            base64,
          } as Record<string, unknown>,
        };
      }

      if (parsed.action === "extract") {
        const result = await repo.extractDocumentText(parsed.file_id);
        if (!result.ok) {
          return { content: [{ type: "text", text: formatError(result.error) }] };
        }

        const { extraction, filename, contentType, size } = result.value;
        const formatter = selectFormatter(parsed.response_format, extractMdFmt, extractJsonFmt);
        const header = [
          `**Arquivo**: ${filename ?? `ID ${parsed.file_id}`}`,
          `**Tipo**: ${contentType}`,
          `**Tamanho**: ${(size / 1024).toFixed(1)} KB`,
          "",
        ].join("\n");

        return {
          content: [{ type: "text", text: header + formatter.format(extraction) }],
          structuredContent: {
            fileId: parsed.file_id,
            filename,
            contentType,
            size,
            extraction,
          } as Record<string, unknown>,
        };
      }

      const result = await repo.resolveTaskFiles({
        kind: parsed.kind,
        courseId: parsed.course_id,
        id: parsed.id,
      });

      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }

      const formatter = selectFormatter(parsed.response_format, tasksMdFmt, tasksJsonFmt);
      return {
        content: [{ type: "text", text: formatter.format(result.value) }],
        structuredContent: result.value as unknown as Record<string, unknown>,
      };
    }
  );
}
