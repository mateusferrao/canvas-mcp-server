import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConversationsRepository } from "../repositories/conversations.js";
import {
  ConversationMarkdownFormatter,
  ConversationJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import {
  PaginationSchema,
  ResponseFormatSchema,
  ConversationIdSchema,
} from "../schemas/common.js";
import { executeListTool, executeSingleTool } from "./base.js";
import { formatError } from "../services/errors.js";
import type { ClientResolver } from "../transport/types.js";

const ListConversationsSchema = z
  .object({
    scope: z
      .enum(["unread", "starred", "archived", "sent"])
      .optional()
      .describe("Filtrar por escopo: unread, starred, archived, sent"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

const GetConversationSchema = z
  .object({
    conversation_id: ConversationIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

const SendMessageSchema = z
  .discriminatedUnion("mode", [
    z.object({
      mode: z.literal("new"),
      recipients: z
        .array(z.string())
        .min(1)
        .describe(
          "IDs dos destinatários. Formatos aceitos: ID numérico (ex: '42'), UUID do usuário, ou 'course_<id>' / 'group_<id>' para envio a um grupo."
        ),
      body: z.string().min(1).describe("Texto da mensagem"),
      subject: z.string().optional().describe("Assunto (máx 255 caracteres)"),
      context_code: z
        .string()
        .optional()
        .describe("Contexto da conversa (ex: 'course_101')"),
    }),
    z.object({
      mode: z.literal("reply"),
      conversation_id: ConversationIdSchema,
      body: z.string().min(1).describe("Texto da resposta"),
    }),
  ]);

const mdFmt = new ConversationMarkdownFormatter();
const jsonFmt = new ConversationJsonFormatter();

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_list_conversations",
    {
      title: "Listar Conversas Canvas (Inbox)",
      description: `Lista as conversas do Inbox Canvas.

Args:
  - scope: filtro (unread, starred, archived, sent — padrão: todas)
  - per_page: 1-100 (default: 25)
  - page: número da página
  - response_format: "markdown" | "json"

Retorna: conversas com assunto, participantes e última mensagem.`,
      inputSchema: ListConversationsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new ConversationsRepository(client);
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeListTool(
        () =>
          repo.list({
            scope: params.scope,
            per_page: params.per_page,
            page: params.page,
          }),
        fmt,
        params.response_format
      );
    }
  );

  server.registerTool(
    "canvas_get_conversation",
    {
      title: "Obter Conversa Canvas",
      description: `Obtém os detalhes e mensagens de uma conversa.

Args:
  - conversation_id: ID da conversa
  - response_format: "markdown" | "json"

Retorna: conversa com histórico de mensagens.`,
      inputSchema: GetConversationSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new ConversationsRepository(client);
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeSingleTool(
        () => repo.get(params.conversation_id),
        fmt
      );
    }
  );

  server.registerTool(
    "canvas_send_message",
    {
      title: "Enviar Mensagem Canvas (Inbox)",
      description: `Cria nova conversa ou responde a uma existente no Inbox Canvas.

Modos:
  - mode="new": cria nova conversa
    - recipients: IDs dos destinatários (strings: ID numérico, UUID, 'course_<id>' ou 'group_<id>')
    - body: texto da mensagem
    - subject: assunto (opcional)
    - context_code: ex 'course_101' (opcional)
  - mode="reply": adiciona mensagem a conversa existente
    - conversation_id: ID da conversa
    - body: texto da resposta

Retorna: confirmação com ID da conversa.

ATENÇÃO: Esta operação envia uma mensagem real no Canvas Inbox.`,
      inputSchema: SendMessageSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new ConversationsRepository(client);
      if (params.mode === "new") {
        const result = await repo.create({
          recipients: params.recipients,
          body: params.body,
          subject: params.subject,
          contextCode: params.context_code,
        });
        if (!result.ok) {
          return { content: [{ type: "text", text: formatError(result.error) }] };
        }
        const conversations = result.value;
        const first = conversations[0];
        const text = `Mensagem enviada com sucesso!\n- Conversa ID: ${first?.id ?? "N/A"}\n- Assunto: ${first?.subject ?? "(sem assunto)"}`;
        return {
          content: [{ type: "text", text }],
          structuredContent: { conversations } as unknown as Record<string, unknown>,
        };
      } else {
        const result = await repo.addMessage(params.conversation_id, {
          body: params.body,
        });
        if (!result.ok) {
          return { content: [{ type: "text", text: formatError(result.error) }] };
        }
        const c = result.value;
        const text = `Resposta enviada com sucesso!\n- Conversa ID: ${c.id}\n- Total de mensagens: ${c.message_count}`;
        return {
          content: [{ type: "text", text }],
          structuredContent: c as unknown as Record<string, unknown>,
        };
      }
    }
  );
}
