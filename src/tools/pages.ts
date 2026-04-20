import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PagesRepository } from "../repositories/pages.js";
import {
  PageMarkdownFormatter,
  PageJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import {
  PaginationSchema,
  ResponseFormatSchema,
  CourseIdSchema,
  PageIdOrUrlSchema,
} from "../schemas/common.js";
import { executeListTool, executeSingleTool } from "./base.js";
import type { ClientResolver } from "../transport/types.js";

const ListPagesSchema = z
  .object({
    course_id: CourseIdSchema,
    search_term: z.string().optional().describe("Filtrar páginas por título"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

const GetPageSchema = z
  .object({
    course_id: CourseIdSchema,
    page_url_or_id: PageIdOrUrlSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

const mdFmt = new PageMarkdownFormatter();
const jsonFmt = new PageJsonFormatter();

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_list_pages",
    {
      title: "Listar Páginas Canvas",
      description: `Lista as páginas de um curso no Canvas.

Args:
  - course_id: ID do curso
  - search_term: filtrar por título (opcional)
  - per_page: 1-100 (default: 25)
  - page: número da página
  - response_format: "markdown" | "json"

Retorna: lista de páginas com título, URL e data de atualização.`,
      inputSchema: ListPagesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new PagesRepository(client);
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
    "canvas_get_page_content",
    {
      title: "Obter Conteúdo de Página Canvas",
      description: `Obtém o conteúdo de uma página Canvas e converte HTML para Markdown.

Args:
  - course_id: ID do curso
  - page_url_or_id: URL slug da página (ex: "introducao-ao-curso") ou ID numérico
  - response_format: "markdown" (converte HTML→Markdown limpo) | "json" (retorna HTML original)

Retorna: conteúdo da página pronto para leitura pelo agente.`,
      inputSchema: GetPageSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new PagesRepository(client);
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeSingleTool(
        () => repo.get(params.course_id, params.page_url_or_id),
        fmt
      );
    }
  );
}
