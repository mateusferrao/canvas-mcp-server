import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AnnouncementsRepository } from "../repositories/announcements.js";
import {
  AnnouncementMarkdownFormatter,
  AnnouncementJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import { ResponseFormatSchema } from "../schemas/common.js";
import { executeListTool } from "./base.js";
import type { ICanvasClient } from "../services/canvasClient.js";

const ListAnnouncementsSchema = z
  .object({
    context_codes: z
      .array(z.string())
      .min(1)
      .max(10)
      .describe('Códigos de contexto (ex: ["course_101"])'),
    start_date: z.string().optional().describe("Data início ISO 8601"),
    end_date: z.string().optional().describe("Data fim ISO 8601"),
    active_only: z.boolean().default(true).describe("Somente anúncios publicados"),
    per_page: z.number().int().min(1).max(100).default(25),
    page: z.number().int().min(1).default(1),
    response_format: ResponseFormatSchema,
  })
  .strict();

export function register(server: McpServer, client: ICanvasClient): void {
  const repo = new AnnouncementsRepository(client);

  server.registerTool(
    "canvas_list_announcements",
    {
      title: "Listar Anúncios Canvas",
      description: `Lista anúncios de cursos no Canvas LMS.

Requer context_codes no formato "course_<id>".
Use canvas_list_courses para obter os IDs dos cursos.

Args:
  - context_codes: array tipo ["course_101"] (obrigatório, max 10)
  - start_date: filtro início (default: 14 dias atrás)
  - end_date: filtro fim (default: 28 dias à frente)
  - active_only: somente publicados (default: true)
  - per_page: 1-100 (default: 25)
  - page: número da página
  - response_format: "markdown" | "json"

Retorna: lista de anúncios com título, autor, data e link.`,
      inputSchema: ListAnnouncementsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const fmt = selectFormatter(
        params.response_format,
        new AnnouncementMarkdownFormatter(),
        new AnnouncementJsonFormatter()
      );
      return executeListTool(
        () => repo.list({
          contextCodes: params.context_codes,
          startDate: params.start_date,
          endDate: params.end_date,
          activeOnly: params.active_only,
          per_page: params.per_page,
          page: params.page,
        }),
        fmt,
        params.response_format
      );
    }
  );
}
