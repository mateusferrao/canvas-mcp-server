import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PlannerRepository } from "../../repositories/planner.js";
import { PlannerNoteMarkdownFormatter } from "../../services/formatters.js";
import { formatError } from "../../services/errors.js";
import { ManagePlannerNoteInputSchema } from "../../schemas/consolidated.js";
import type { ClientResolver } from "../../transport/types.js";

const noteMdFmt = new PlannerNoteMarkdownFormatter();

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_manage_planner_note",
    {
      title: "Gerenciar Nota do Planejador Canvas",
      description: "Cria, atualiza ou exclui notas do planejador pessoal.",
      inputSchema: ManagePlannerNoteInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const parsed = ManagePlannerNoteInputSchema.parse(params);
      const { client } = resolveClient(extra.sessionId);
      const repo = new PlannerRepository(client);

      if (parsed.action === "create") {
        const result = await repo.create({
          title: parsed.title,
          todo_date: parsed.todo_date,
          details: parsed.details,
          course_id: parsed.course_id,
          linked_object_type: parsed.linked_object_type,
          linked_object_id: parsed.linked_object_id,
        });

        if (!result.ok) {
          return { content: [{ type: "text", text: formatError(result.error) }] };
        }

        return {
          content: [{ type: "text", text: noteMdFmt.format(result.value) }],
          structuredContent: result.value as unknown as Record<string, unknown>,
        };
      }

      if (parsed.action === "update") {
        const result = await repo.update(parsed.id, {
          title: parsed.title,
          todo_date: parsed.todo_date,
          details: parsed.details,
          course_id: parsed.course_id,
        });

        if (!result.ok) {
          return { content: [{ type: "text", text: formatError(result.error) }] };
        }

        return {
          content: [{ type: "text", text: noteMdFmt.format(result.value) }],
          structuredContent: result.value as unknown as Record<string, unknown>,
        };
      }

      const result = await repo.delete(parsed.id);
      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }

      return {
        content: [{ type: "text", text: `Nota ${parsed.id} excluída com sucesso.` }],
      };
    }
  );
}
