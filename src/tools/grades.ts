import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GradesRepository } from "../repositories/grades.js";
import {
  GradesMarkdownFormatter,
  GradesJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import { ResponseFormatSchema, CourseIdSchema } from "../schemas/common.js";
import { executeSingleTool } from "./base.js";
import type { ClientResolver } from "../transport/types.js";

const GetGradesSchema = z
  .object({
    course_id: CourseIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

const mdFmt = new GradesMarkdownFormatter();
const jsonFmt = new GradesJsonFormatter();

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_get_course_grades",
    {
      title: "Obter Notas do Curso Canvas",
      description: `Obtém as notas do estudante em um curso específico.

Args:
  - course_id: ID do curso
  - response_format: "markdown" | "json"

Retorna: nota atual e nota final (letra e percentual) da matrícula do estudante.`,
      inputSchema: GetGradesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new GradesRepository(client);
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeSingleTool(
        () => repo.getCourseGrades(params.course_id),
        fmt
      );
    }
  );
}
