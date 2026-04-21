import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DiscussionsRepository } from "../../repositories/discussions.js";
import { formatError } from "../../services/errors.js";
import { PostDiscussionEntryInputSchema } from "../../schemas/consolidated.js";
import type { ClientResolver } from "../../transport/types.js";

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_post_discussion_entry",
    {
      title: "Postar Entrada em Discussão Canvas",
      description: "Posta uma entrada de discussão (ou reply) no Canvas.",
      inputSchema: PostDiscussionEntryInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const parsed = PostDiscussionEntryInputSchema.parse(params);
      const { client } = resolveClient(extra.sessionId);
      const repo = new DiscussionsRepository(client);

      const result = await repo.postEntry(parsed.course_id, parsed.topic_id, {
        message: parsed.message,
        parentEntryId: parsed.parent_entry_id,
      });

      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }

      const entry = result.value;
      const action = parsed.parent_entry_id ? "Resposta" : "Entrada";
      const text = `${action} postada com sucesso!\n- ID: ${entry.id}\n- Postada em: ${entry.created_at}`;
      return {
        content: [{ type: "text", text }],
        structuredContent: entry as unknown as Record<string, unknown>,
      };
    }
  );
}
