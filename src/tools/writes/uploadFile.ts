import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FilesRepository } from "../../repositories/files.js";
import {
  FileJsonFormatter,
  FileMarkdownFormatter,
  selectFormatter,
} from "../../services/formatters.js";
import { formatError } from "../../services/errors.js";
import { ResponseFormatSchema } from "../../schemas/common.js";
import { API_VERSION } from "../../constants.js";
import type { ClientResolver } from "../../transport/types.js";

const MAX_UPLOAD_BYTES =
  parseInt(process.env["CANVAS_UPLOAD_MAX_BYTES"] ?? "0") || 50 * 1024 * 1024;

const UploadFileInputSchema = z
  .object({
    response_format: ResponseFormatSchema,
    file_name: z.string().min(1).describe("Nome do arquivo no Canvas"),
    content_type: z
      .string()
      .optional()
      .describe("MIME type (ex: application/pdf, image/png)"),
    parent_folder_path: z
      .string()
      .optional()
      .describe("Pasta destino no Canvas (ex: /uploads/trabalhos)"),
    on_duplicate: z
      .enum(["overwrite", "rename"])
      .default("rename")
      .describe("Comportamento para nome duplicado"),
  })
  .and(
    z.union([
      z.object({
        file_path: z.string().min(1),
        file_content_base64: z.undefined().optional(),
      }),
      z.object({
        file_content_base64: z.string().min(1),
        file_path: z.undefined().optional(),
      }),
    ])
  );

const fileMdFmt = new FileMarkdownFormatter();
const fileJsonFmt = new FileJsonFormatter();

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_upload_file",
    {
      title: "Upload de Arquivo Canvas",
      description: "Faz upload de arquivo para o Canvas usando file_path ou file_content_base64.",
      inputSchema: UploadFileInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const parsed = UploadFileInputSchema.parse(params);
      const { client, token, domain } = resolveClient(extra.sessionId);

      const baseUrl = `https://${domain}/api/${API_VERSION}`;
      const repo = new FilesRepository(client, token, baseUrl);

      let fileBuffer: Buffer;

      if ("file_path" in parsed && parsed.file_path) {
        const absolutePath = path.resolve(parsed.file_path);

        if (!fs.existsSync(absolutePath)) {
          return {
            content: [{ type: "text", text: `Arquivo não encontrado: ${absolutePath}` }],
          };
        }

        const stat = fs.statSync(absolutePath);
        if (stat.size > MAX_UPLOAD_BYTES) {
          return {
            content: [
              {
                type: "text",
                text: `Arquivo excede o tamanho máximo de ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB.`,
              },
            ],
          };
        }

        fileBuffer = fs.readFileSync(absolutePath);
      } else {
        const base64Content = "file_content_base64" in parsed ? parsed.file_content_base64 : undefined;
        if (!base64Content) {
          return {
            content: [{ type: "text", text: "file_content_base64 é obrigatório quando file_path não é informado." }],
          };
        }

        fileBuffer = Buffer.from(base64Content, "base64");
        if (fileBuffer.byteLength > MAX_UPLOAD_BYTES) {
          return {
            content: [
              {
                type: "text",
                text: `Arquivo excede o tamanho máximo de ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB.`,
              },
            ],
          };
        }
      }

      const result = await repo.uploadUserFile({
        name: parsed.file_name,
        fileBuffer,
        contentType: parsed.content_type,
        parentFolderPath: parsed.parent_folder_path,
        onDuplicate: parsed.on_duplicate,
      });

      if (!result.ok) {
        return {
          content: [{ type: "text", text: formatError(result.error) }],
        };
      }

      const formatter = selectFormatter(parsed.response_format, fileMdFmt, fileJsonFmt);
      return {
        content: [{ type: "text", text: formatter.format(result.value) }],
        structuredContent: result.value as unknown as Record<string, unknown>,
      };
    }
  );
}
