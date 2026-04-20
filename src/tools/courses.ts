import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CoursesRepository } from "../repositories/courses.js";
import {
  CourseMarkdownFormatter,
  CourseJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import {
  PaginationSchema,
  ResponseFormatSchema,
  CourseIdSchema,
} from "../schemas/common.js";
import { executeListTool, executeSingleTool } from "./base.js";
import type { ClientResolver } from "../transport/types.js";

const ListCoursesSchema = z
  .object({
    enrollment_state: z
      .enum(["active", "invited_or_pending", "completed"])
      .default("active")
      .describe("Estado da matrícula"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

const GetCourseSchema = z
  .object({
    course_id: CourseIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

// Formatters are stateless — safe to share across sessions
const mdFmt = new CourseMarkdownFormatter();
const jsonFmt = new CourseJsonFormatter();

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_list_courses",
    {
      title: "Listar Cursos Canvas",
      description: `Lista os cursos do usuário no Canvas LMS.

Retorna cursos matriculados (padrão: ativos). Inclui nome, código, estado e nota atual.

Args:
  - enrollment_state: "active" | "invited_or_pending" | "completed" (default: "active")
  - per_page: itens por página 1-100 (default: 25)
  - page: número da página (default: 1)
  - response_format: "markdown" | "json" (default: "markdown")

Retorna: lista de cursos com ID, nome, código e nota.`,
      inputSchema: ListCoursesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new CoursesRepository(client);
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeListTool(
        () => repo.list({ enrollment_state: params.enrollment_state, per_page: params.per_page, page: params.page }),
        fmt,
        params.response_format
      );
    }
  );

  server.registerTool(
    "canvas_get_course",
    {
      title: "Obter Curso Canvas",
      description: `Obtém detalhes de um curso específico pelo ID.

Args:
  - course_id: ID numérico do curso
  - response_format: "markdown" | "json" (default: "markdown")

Retorna: detalhes completos do curso incluindo matrícula e notas.`,
      inputSchema: GetCourseSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new CoursesRepository(client);
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeSingleTool(() => repo.get(params.course_id), fmt);
    }
  );
}
