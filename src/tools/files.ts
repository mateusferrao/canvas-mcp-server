import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FilesRepository } from "../repositories/files.js";
import { FileMarkdownFormatter, FileJsonFormatter, selectFormatter } from "../services/formatters.js";
import { ResponseFormatSchema } from "../schemas/common.js";
import { formatError } from "../services/errors.js";
import { API_VERSION } from "../constants.js";
import type { ClientResolver } from "../transport/types.js";

const MAX_UPLOAD_BYTES =
  parseInt(process.env["CANVAS_UPLOAD_MAX_BYTES"] ?? "0") || 50 * 1024 * 1024;

const UploadFileSchema = z
  .object({
    response_format: ResponseFormatSchema,
    file_name: z.string().min(1).describe("Nome do arquivo no Canvas"),
    content_type: z
      .string()
      .optional()
      .describe("MIME type (ex: 'application/pdf', 'image/png'). Auto-detectado se omitido."),
    parent_folder_path: z
      .string()
      .optional()
      .describe("Caminho da pasta destino no Canvas (ex: '/uploads/trabalhos'). Criada se não existir."),
    on_duplicate: z
      .enum(["overwrite", "rename"])
      .default("rename")
      .describe("Comportamento para nome duplicado: 'overwrite' (substituir) ou 'rename' (adicionar sufixo)"),
  })
  .and(
    z.union([
      z.object({
        file_path: z
          .string()
          .min(1)
          .describe("Caminho absoluto do arquivo no sistema de arquivos local"),
        file_content_base64: z.undefined().optional(),
      }),
      z.object({
        file_content_base64: z
          .string()
          .min(1)
          .describe("Conteúdo do arquivo em Base64"),
        file_path: z.undefined().optional(),
      }),
    ])
  );

const mdFmt = new FileMarkdownFormatter();
const jsonFmt = new FileJsonFormatter();

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_upload_file",
    {
      title: "Upload de Arquivo Canvas",
      description: `Faz upload de um arquivo para o Canvas LMS (pasta Meus Arquivos).

Modos de entrada:
  - file_path: caminho absoluto do arquivo no sistema local
  - file_content_base64: conteúdo do arquivo em Base64

Args obrigatórios:
  - file_name: nome do arquivo no Canvas
  - (file_path OU file_content_base64)

Args opcionais:
  - content_type: MIME type
  - parent_folder_path: pasta destino
  - on_duplicate: "rename" (padrão) | "overwrite"
  - response_format: "markdown" | "json"

Tamanho máximo: ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB (configurável via CANVAS_UPLOAD_MAX_BYTES).

Retorna: metadados do arquivo com URL de download.`,
      inputSchema: UploadFileSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client, token, domain } = resolveClient(extra.sessionId);
      const baseUrl = `https://${domain}/api/${API_VERSION}`;
      const repo = new FilesRepository(client, token, baseUrl);

      let fileBuffer: Buffer;

      if (params.file_path) {
        const absPath = path.resolve(params.file_path);
        if (!fs.existsSync(absPath)) {
          return {
            content: [{ type: "text", text: `Arquivo não encontrado: ${absPath}` }],
          };
        }
        const stat = fs.statSync(absPath);
        if (stat.size > MAX_UPLOAD_BYTES) {
          return {
            content: [{ type: "text", text: `Arquivo excede o tamanho máximo de ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB.` }],
          };
        }
        fileBuffer = fs.readFileSync(absPath);
      } else {
        fileBuffer = Buffer.from(params.file_content_base64!, "base64");
        if (fileBuffer.byteLength > MAX_UPLOAD_BYTES) {
          return {
            content: [{ type: "text", text: `Arquivo excede o tamanho máximo de ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB.` }],
          };
        }
      }

      const result = await repo.uploadUserFile({
        name: params.file_name,
        fileBuffer,
        contentType: params.content_type,
        parentFolderPath: params.parent_folder_path,
        onDuplicate: params.on_duplicate,
      });

      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }

      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      const f = result.value;
      return {
        content: [{ type: "text", text: fmt.format(f) }],
        structuredContent: f as unknown as Record<string, unknown>,
      };
    }
  );
}
