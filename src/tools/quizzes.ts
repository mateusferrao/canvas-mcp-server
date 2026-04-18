import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { QuizzesRepository } from "../repositories/quizzes.js";
import {
  QuizMarkdownFormatter,
  QuizJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import {
  PaginationSchema,
  ResponseFormatSchema,
  CourseIdSchema,
  QuizIdSchema,
} from "../schemas/common.js";
import { executeListTool, executeSingleTool } from "./base.js";
import type { ICanvasClient } from "../services/canvasClient.js";

const ListQuizzesSchema = z
  .object({
    course_id: CourseIdSchema,
    search_term: z.string().optional().describe("Filtrar por título"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

const GetQuizSchema = z
  .object({
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export function register(server: McpServer, client: ICanvasClient): void {
  const repo = new QuizzesRepository(client);
  const mdFmt = new QuizMarkdownFormatter();
  const jsonFmt = new QuizJsonFormatter();

  server.registerTool(
    "canvas_list_quizzes",
    {
      title: "Listar Quizzes Canvas",
      description: `Lista os quizzes de um curso no Canvas.

Args:
  - course_id: ID do curso
  - search_term: filtrar por título (opcional)
  - per_page: 1-100 (default: 25)
  - page: número da página
  - response_format: "markdown" | "json"

Retorna: quizzes com prazo, pontos e número de questões.`,
      inputSchema: ListQuizzesSchema,
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
          repo.list(params.course_id, {
            per_page: params.per_page,
            page: params.page,
            search_term: params.search_term,
          }),
        fmt,
        params.response_format
      );
    }
  );

  server.registerTool(
    "canvas_get_quiz",
    {
      title: "Obter Quiz Canvas",
      description: `Obtém os detalhes de um quiz específico.

Args:
  - course_id: ID do curso
  - quiz_id: ID do quiz
  - response_format: "markdown" | "json"

Retorna: detalhes do quiz (tipo, questões, tempo, tentativas, prazo).
Nota: leitura apenas. Para tomar o quiz, acesse o link html_url.`,
      inputSchema: GetQuizSchema,
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
        () => repo.get(params.course_id, params.quiz_id),
        fmt
      );
    }
  );
}
