import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CanvasGetInputSchema } from "../../schemas/consolidated.js";
import type { ClientResolver } from "../../transport/types.js";
import { dispatchCanvasGet } from "../dispatchers/getDispatcher.js";

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_get",
    {
      title: "Obter Recurso Canvas (Consolidado)",
      description: `Tool polimórfica para operações get no Canvas.

Kinds disponíveis:
- profile: perfil autenticado
- course: detalhes de curso
- assignment: detalhes de tarefa
- submission: submissão da tarefa
- page_content: conteúdo de página wiki
- discussion: tópico de discussão
- conversation: conversa inbox
- quiz: metadados do quiz
- quiz_submission: tentativa específica do quiz
- quiz_submission_questions: estado das questões da tentativa
- quiz_time_left: tempo restante da tentativa
- course_grades: notas do curso
- file: metadados de arquivo

Use response_format: "markdown" ou "json".`,
      inputSchema: CanvasGetInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const context = resolveClient(extra.sessionId);
      return dispatchCanvasGet(params, context);
    }
  );
}
