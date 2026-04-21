import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConversationsRepository } from "../../repositories/conversations.js";
import { formatError } from "../../services/errors.js";
import { SendMessageInputSchema } from "../../schemas/consolidated.js";
import type { ClientResolver } from "../../transport/types.js";

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_send_message",
    {
      title: "Enviar Mensagem Canvas (Inbox)",
      description: "Cria conversa nova (mode=new) ou responde conversa existente (mode=reply).",
      inputSchema: SendMessageInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const parsed = SendMessageInputSchema.parse(params);
      const { client } = resolveClient(extra.sessionId);
      const repo = new ConversationsRepository(client);

      if (parsed.mode === "new") {
        const result = await repo.create({
          recipients: parsed.recipients,
          body: parsed.body,
          subject: parsed.subject,
          contextCode: parsed.context_code,
        });

        if (!result.ok) {
          return { content: [{ type: "text", text: formatError(result.error) }] };
        }

        const first = result.value[0];
        return {
          content: [
            {
              type: "text",
              text: `Mensagem enviada com sucesso!\n- Conversa ID: ${first?.id ?? "N/A"}\n- Assunto: ${first?.subject ?? "(sem assunto)"}`,
            },
          ],
          structuredContent: { conversations: result.value } as Record<string, unknown>,
        };
      }

      const result = await repo.addMessage(parsed.conversation_id, { body: parsed.body });
      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }

      return {
        content: [
          {
            type: "text",
            text: `Resposta enviada com sucesso!\n- Conversa ID: ${result.value.id}\n- Total de mensagens: ${result.value.message_count}`,
          },
        ],
        structuredContent: result.value as unknown as Record<string, unknown>,
      };
    }
  );
}
