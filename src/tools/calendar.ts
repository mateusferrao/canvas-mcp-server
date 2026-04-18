import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CalendarRepository } from "../repositories/calendar.js";
import {
  CalendarMarkdownFormatter,
  CalendarJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import { ResponseFormatSchema } from "../schemas/common.js";
import { executeListTool } from "./base.js";
import type { ICanvasClient } from "../services/canvasClient.js";

const ListCalendarSchema = z
  .object({
    context_codes: z
      .array(z.string())
      .min(1)
      .max(10)
      .describe('Códigos de contexto (ex: ["course_101", "course_102"])'),
    type: z
      .enum(["event", "assignment"])
      .default("assignment")
      .describe("Tipo de evento"),
    start_date: z.string().optional().describe("Data início ISO 8601 (ex: 2024-06-01)"),
    end_date: z.string().optional().describe("Data fim ISO 8601 (ex: 2024-07-01)"),
    per_page: z.number().int().min(1).max(100).default(25),
    page: z.number().int().min(1).default(1),
    response_format: ResponseFormatSchema,
  })
  .strict();

export function register(server: McpServer, client: ICanvasClient): void {
  const repo = new CalendarRepository(client);

  server.registerTool(
    "canvas_list_calendar_events",
    {
      title: "Listar Eventos de Calendário Canvas",
      description: `Lista eventos ou tarefas do calendário do Canvas.

Requer context_codes no formato "course_<id>" para filtrar por cursos.
Use canvas_list_courses para obter os IDs dos cursos.

Args:
  - context_codes: array de strings tipo ["course_101", "course_102"] (obrigatório, max 10)
  - type: "assignment" | "event" (default: "assignment")
  - start_date: data início ISO 8601
  - end_date: data fim ISO 8601
  - per_page: 1-100 (default: 25)
  - page: número da página
  - response_format: "markdown" | "json"

Retorna: lista de eventos/tarefas no período especificado.`,
      inputSchema: ListCalendarSchema,
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
        new CalendarMarkdownFormatter(),
        new CalendarJsonFormatter()
      );
      return executeListTool(
        () => repo.listEvents({
          contextCodes: params.context_codes,
          type: params.type,
          startDate: params.start_date,
          endDate: params.end_date,
          per_page: params.per_page,
          page: params.page,
        }),
        fmt,
        params.response_format
      );
    }
  );
}
