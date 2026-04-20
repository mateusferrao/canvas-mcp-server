import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DiscussionsRepository } from "../repositories/discussions.js";
import {
  DiscussionTopicMarkdownFormatter,
  DiscussionTopicJsonFormatter,
  DiscussionEntryMarkdownFormatter,
  DiscussionEntryJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import {
  PaginationSchema,
  ResponseFormatSchema,
  CourseIdSchema,
  TopicIdSchema,
  EntryIdSchema,
} from "../schemas/common.js";
import { executeListTool, executeSingleTool } from "./base.js";
import { formatError } from "../services/errors.js";
import type { ClientResolver } from "../transport/types.js";

const ListDiscussionsSchema = z
  .object({
    course_id: CourseIdSchema,
    search_term: z.string().optional().describe("Filtrar por título"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

const GetDiscussionSchema = z
  .object({
    course_id: CourseIdSchema,
    topic_id: TopicIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

const PostDiscussionEntrySchema = z
  .object({
    course_id: CourseIdSchema,
    topic_id: TopicIdSchema,
    message: z
      .string()
      .min(1)
      .describe("Conteúdo da entrada. Aceita HTML (ex: '<p>Texto</p>') ou texto simples."),
    parent_entry_id: EntryIdSchema.optional().describe(
      "ID da entrada-pai para postar uma resposta (reply). Omitir para nova entrada de nível superior."
    ),
  })
  .strict();

const mdFmt = new DiscussionTopicMarkdownFormatter();
const jsonFmt = new DiscussionTopicJsonFormatter();
const mdEntryFmt = new DiscussionEntryMarkdownFormatter();
const jsonEntryFmt = new DiscussionEntryJsonFormatter();

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_list_discussions",
    {
      title: "Listar Discussões Canvas",
      description: `Lista os tópicos de discussão de um curso.

Args:
  - course_id: ID do curso
  - search_term: filtrar por título (opcional)
  - per_page: 1-100 (default: 25)
  - page: número da página
  - response_format: "markdown" | "json"

Retorna: tópicos com autor, estado e datas.`,
      inputSchema: ListDiscussionsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new DiscussionsRepository(client);
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
    "canvas_get_discussion",
    {
      title: "Obter Discussão Canvas",
      description: `Obtém detalhes de um tópico de discussão e suas entradas.

Args:
  - course_id: ID do curso
  - topic_id: ID do tópico de discussão
  - response_format: "markdown" | "json"

Retorna: tópico com mensagem convertida para Markdown (formato markdown) ou HTML original (json).`,
      inputSchema: GetDiscussionSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new DiscussionsRepository(client);
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeSingleTool(
        () => repo.get(params.course_id, params.topic_id),
        fmt
      );
    }
  );

  server.registerTool(
    "canvas_post_discussion_entry",
    {
      title: "Postar Entrada em Discussão Canvas",
      description: `Posta uma entrada ou resposta em um fórum de discussão.

Args:
  - course_id: ID do curso
  - topic_id: ID do tópico de discussão
  - message: conteúdo da mensagem (HTML ou texto simples)
  - parent_entry_id: ID da entrada-pai (para reply). Omitir para nova entrada de nível superior.

Retorna: confirmação com ID da entrada criada.

ATENÇÃO: Esta operação posta uma mensagem real no fórum Canvas. Verifique antes de confirmar.`,
      inputSchema: PostDiscussionEntrySchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new DiscussionsRepository(client);
      const result = await repo.postEntry(params.course_id, params.topic_id, {
        message: params.message,
        parentEntryId: params.parent_entry_id,
      });

      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }

      const e = result.value;
      const action = params.parent_entry_id ? "Resposta" : "Entrada";
      const text = `${action} postada com sucesso!\n- ID: ${e.id}\n- Postada em: ${e.created_at}`;
      return {
        content: [{ type: "text", text }],
        structuredContent: e as unknown as Record<string, unknown>,
      };
    }
  );
}
