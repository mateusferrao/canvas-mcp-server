import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TodoRepository } from "../repositories/todo.js";
import {
  TodoMarkdownFormatter,
  TodoJsonFormatter,
  AssignmentMarkdownFormatter,
  AssignmentJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import { PaginationSchema, ResponseFormatSchema } from "../schemas/common.js";
import { executeListTool } from "./base.js";
import type { ICanvasClient } from "../services/canvasClient.js";

const TodoBaseSchema = z
  .object({
    per_page: z.number().int().min(1).max(100).default(25),
    response_format: ResponseFormatSchema,
  })
  .strict();

const ListMissingSchema = z
  .object({
    per_page: z.number().int().min(1).max(100).default(25),
    course_ids: z
      .array(z.number().int().positive())
      .optional()
      .describe("Filtrar por IDs de cursos específicos"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export function register(server: McpServer, client: ICanvasClient): void {
  const repo = new TodoRepository(client);

  server.registerTool(
    "canvas_list_todo",
    {
      title: "Listar Pendências Canvas",
      description: `Lista tarefas pendentes do aluno (to-do list) no Canvas.

Inclui tarefas a entregar e quizzes pendentes.

Args:
  - per_page: 1-100 (default: 25)
  - response_format: "markdown" | "json"

Retorna: lista de itens pendentes com prazo e link.`,
      inputSchema: TodoBaseSchema,
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
        new TodoMarkdownFormatter(),
        new TodoJsonFormatter()
      );
      return executeListTool(
        () => repo.listTodo(params.per_page),
        fmt,
        params.response_format
      );
    }
  );

  server.registerTool(
    "canvas_list_upcoming_events",
    {
      title: "Listar Próximos Eventos Canvas",
      description: `Lista próximos eventos e tarefas com prazo do usuário no Canvas.

Útil para planejar a agenda acadêmica dos próximos dias.

Args:
  - per_page: 1-100 (default: 25)
  - response_format: "markdown" | "json"

Retorna: lista de eventos e tarefas próximas ordenadas por data.`,
      inputSchema: TodoBaseSchema,
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
        new AssignmentMarkdownFormatter(),
        new AssignmentJsonFormatter()
      );
      return executeListTool(
        () => repo.listUpcoming(params.per_page),
        fmt,
        params.response_format
      );
    }
  );

  server.registerTool(
    "canvas_list_missing_submissions",
    {
      title: "Listar Entregas Faltando Canvas",
      description: `Lista tarefas vencidas sem entrega do aluno no Canvas.

Retorna tarefas com prazo expirado que ainda não foram submetidas.

Args:
  - per_page: 1-100 (default: 25)
  - course_ids: filtrar por cursos específicos (opcional)
  - response_format: "markdown" | "json"

Retorna: lista de tarefas faltando com prazo original.`,
      inputSchema: ListMissingSchema,
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
        new AssignmentMarkdownFormatter(),
        new AssignmentJsonFormatter()
      );
      return executeListTool(
        () => repo.listMissing({ per_page: params.per_page, course_ids: params.course_ids }),
        fmt,
        params.response_format
      );
    }
  );
}
