import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ModulesRepository } from "../../repositories/modules.js";
import { formatError } from "../../services/errors.js";
import { MarkModuleItemDoneInputSchema } from "../../schemas/consolidated.js";
import type { ClientResolver } from "../../transport/types.js";

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_mark_module_item_done",
    {
      title: "Marcar Item de Módulo como Concluído",
      description: "Marca um item de módulo como concluído no Canvas.",
      inputSchema: MarkModuleItemDoneInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const parsed = MarkModuleItemDoneInputSchema.parse(params);
      const { client } = resolveClient(extra.sessionId);
      const repo = new ModulesRepository(client);

      const result = await repo.markItemDone(parsed.course_id, parsed.module_id, parsed.item_id);
      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }

      return {
        content: [
          {
            type: "text",
            text: `Item ${parsed.item_id} do módulo ${parsed.module_id} marcado como concluído.`,
          },
        ],
      };
    }
  );
}
