import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PlannerRepository } from "../repositories/planner.js";
import {
  PlannerNoteMarkdownFormatter,
  PlannerNoteJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import {
  PaginationSchema,
  ResponseFormatSchema,
  PlannerNoteIdSchema,
} from "../schemas/common.js";
import { executeListTool } from "./base.js";
import { formatError } from "../services/errors.js";
import type { ICanvasClient } from "../services/canvasClient.js";

const ListPlannerNotesSchema = z
  .object({
    start_date: z
      .string()
      .optional()
      .describe("Data inicial no formato YYYY-MM-DD"),
    end_date: z
      .string()
      .optional()
      .describe("Data final no formato YYYY-MM-DD"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

const ManagePlannerNoteSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    title: z.string().min(1).describe("Título da nota"),
    todo_date: z.string().describe("Data no formato YYYY-MM-DD"),
    details: z.string().optional().describe("Detalhes/descrição da nota"),
    course_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("ID do curso associado (opcional)"),
    linked_object_type: z
      .string()
      .optional()
      .describe(
        "Tipo do objeto vinculado: 'assignment', 'discussion_topic', 'wiki_page', 'quiz', 'announcement'"
      ),
    linked_object_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("ID do objeto vinculado"),
  }),
  z.object({
    action: z.literal("update"),
    id: PlannerNoteIdSchema,
    title: z.string().min(1).optional().describe("Novo título"),
    todo_date: z.string().optional().describe("Nova data YYYY-MM-DD"),
    details: z.string().optional().describe("Novos detalhes"),
    course_id: z.number().int().positive().optional(),
  }),
  z.object({
    action: z.literal("delete"),
    id: PlannerNoteIdSchema,
  }),
]);

export function register(server: McpServer, client: ICanvasClient): void {
  const repo = new PlannerRepository(client);
  const mdFmt = new PlannerNoteMarkdownFormatter();
  const jsonFmt = new PlannerNoteJsonFormatter();

  server.registerTool(
    "canvas_list_planner_notes",
    {
      title: "Listar Notas do Planejador Canvas",
      description: `Lista as notas do planejador pessoal do usuário.

Args:
  - start_date: data inicial YYYY-MM-DD (opcional)
  - end_date: data final YYYY-MM-DD (opcional)
  - per_page: 1-100 (default: 25)
  - page: número da página
  - response_format: "markdown" | "json"

Retorna: notas com título, data e curso associado.`,
      inputSchema: ListPlannerNotesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeListTool(
        () =>
          repo.list({
            start_date: params.start_date,
            end_date: params.end_date,
            per_page: params.per_page,
            page: params.page,
          }),
        fmt,
        params.response_format
      );
    }
  );

  server.registerTool(
    "canvas_manage_planner_note",
    {
      title: "Gerenciar Nota do Planejador Canvas",
      description: `Cria, atualiza ou exclui uma nota do planejador pessoal Canvas.

Ações:
  - action="create": cria nova nota (title, todo_date obrigatórios)
  - action="update": atualiza nota existente (id obrigatório)
  - action="delete": exclui nota (id obrigatório)

Retorna: nota resultante (create/update) ou confirmação (delete).`,
      inputSchema: ManagePlannerNoteSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      if (params.action === "create") {
        const result = await repo.create({
          title: params.title,
          todo_date: params.todo_date,
          details: params.details,
          course_id: params.course_id,
          linked_object_type: params.linked_object_type,
          linked_object_id: params.linked_object_id,
        });
        if (!result.ok) {
          return { content: [{ type: "text", text: formatError(result.error) }] };
        }
        const n = result.value;
        return {
          content: [{ type: "text", text: mdFmt.format(n) }],
          structuredContent: n as unknown as Record<string, unknown>,
        };
      }

      if (params.action === "update") {
        const result = await repo.update(params.id, {
          title: params.title,
          todo_date: params.todo_date,
          details: params.details,
          course_id: params.course_id,
        });
        if (!result.ok) {
          return { content: [{ type: "text", text: formatError(result.error) }] };
        }
        const n = result.value;
        return {
          content: [{ type: "text", text: mdFmt.format(n) }],
          structuredContent: n as unknown as Record<string, unknown>,
        };
      }

      // action === "delete"
      const result = await repo.delete(params.id);
      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }
      return {
        content: [{ type: "text", text: `Nota ${params.id} excluída com sucesso.` }],
      };
    }
  );
}
