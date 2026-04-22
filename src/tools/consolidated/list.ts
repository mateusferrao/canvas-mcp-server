import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CanvasListInputSchema } from "../../schemas/consolidated.js";
import type { ClientResolver } from "../../transport/types.js";
import { dispatchCanvasList } from "../dispatchers/listDispatcher.js";

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_list",
    {
      title: "Listar Recursos Canvas (Consolidado)",
      description: `Tool polimórfica para listagens Canvas. Escolha o kind correto.

Kinds disponíveis:
- courses: cursos matriculados
- assignments: tarefas de um curso
- todo: pendências globais
- modules: módulos de um curso
- module_items: itens de um módulo
- pages: páginas wiki do curso
- discussions: tópicos de discussão
- conversations: conversas do inbox
- planner_notes: notas do planejador
- quizzes: quizzes de um curso
- quiz_questions: questões de um quiz
- quiz_submissions: tentativas do quiz
- submissions: submissões do aluno no curso
- announcements: anúncios de cursos
- calendar_events: eventos/calendário
- upcoming_events: próximos eventos globais
- missing_submissions: tarefas vencidas sem entrega
- files: arquivos do curso

Use response_format: "markdown" ou "json".`,
      inputSchema: CanvasListInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const context = resolveClient(extra.sessionId);
      return dispatchCanvasList(params, context);
    }
  );
}
