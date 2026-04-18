import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AssignmentsRepository } from "../repositories/assignments.js";
import {
  AssignmentMarkdownFormatter,
  AssignmentJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import {
  PaginationSchema,
  ResponseFormatSchema,
  CourseIdSchema,
  AssignmentIdSchema,
} from "../schemas/common.js";
import { executeListTool, executeSingleTool } from "./base.js";
import type { ICanvasClient } from "../services/canvasClient.js";

const ListAssignmentsSchema = z
  .object({
    course_id: CourseIdSchema,
    bucket: z
      .enum(["past", "overdue", "undated", "ungraded", "unsubmitted", "upcoming", "future"])
      .optional()
      .describe("Filtro por status da tarefa"),
    search_term: z.string().max(200).optional().describe("Busca por nome parcial"),
    order_by: z
      .enum(["position", "name", "due_at"])
      .default("due_at")
      .describe("Ordenação"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

const GetAssignmentSchema = z
  .object({
    course_id: CourseIdSchema,
    assignment_id: AssignmentIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export function register(server: McpServer, client: ICanvasClient): void {
  const repo = new AssignmentsRepository(client);
  const mdFmt = new AssignmentMarkdownFormatter();
  const jsonFmt = new AssignmentJsonFormatter();

  server.registerTool(
    "canvas_list_assignments",
    {
      title: "Listar Tarefas Canvas",
      description: `Lista tarefas de um curso no Canvas LMS.

Args:
  - course_id: ID do curso (obrigatório)
  - bucket: filtro — "overdue" | "upcoming" | "unsubmitted" | etc.
  - search_term: filtro por nome parcial
  - order_by: "due_at" | "name" | "position" (default: "due_at")
  - per_page: 1-100 (default: 25)
  - page: número da página (default: 1)
  - response_format: "markdown" | "json"

Retorna: lista de tarefas com prazo, pontos e tipos de entrega.`,
      inputSchema: ListAssignmentsSchema,
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
        () => repo.list({
          courseId: params.course_id,
          bucket: params.bucket,
          search_term: params.search_term,
          order_by: params.order_by,
          per_page: params.per_page,
          page: params.page,
        }),
        fmt,
        params.response_format
      );
    }
  );

  server.registerTool(
    "canvas_get_assignment",
    {
      title: "Obter Tarefa Canvas",
      description: `Obtém detalhes de uma tarefa específica.

Args:
  - course_id: ID do curso
  - assignment_id: ID da tarefa
  - response_format: "markdown" | "json"

Retorna: detalhes completos com prazo, pontuação e estado de submissão.`,
      inputSchema: GetAssignmentSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeSingleTool(
        () => repo.get(params.course_id, params.assignment_id),
        fmt
      );
    }
  );
}
