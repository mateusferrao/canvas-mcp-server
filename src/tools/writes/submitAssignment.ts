import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SubmissionsRepository } from "../../repositories/submissions.js";
import { formatError } from "../../services/errors.js";
import { SubmitAssignmentInputSchema } from "../../schemas/consolidated.js";
import type { ClientResolver } from "../../transport/types.js";

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_submit_assignment",
    {
      title: "Entregar Tarefa Canvas",
      description: `Entrega uma tarefa no Canvas. Tipos: online_text_entry, online_url, online_upload.`,
      inputSchema: SubmitAssignmentInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const parsed = SubmitAssignmentInputSchema.parse(params);
      const { client } = resolveClient(extra.sessionId);
      const repo = new SubmissionsRepository(client);

      const result = await repo.submit({
        courseId: parsed.course_id,
        assignmentId: parsed.assignment_id,
        submissionType: parsed.submission_type,
        body: parsed.body,
        url: parsed.url,
        fileIds: parsed.file_ids,
      });

      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }

      const submission = result.value;
      const text = [
        "Entrega realizada com sucesso!",
        `- ID: ${submission.id}`,
        `- Estado: ${submission.workflow_state}`,
        `- Enviado em: ${submission.submitted_at ?? "agora"}`,
      ].join("\n");

      return {
        content: [{ type: "text", text }],
        structuredContent: submission as unknown as Record<string, unknown>,
      };
    }
  );
}
