import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { QuizzesRepository } from "../../repositories/quizzes.js";
import { QuizSubmissionMarkdownFormatter } from "../../services/formatters.js";
import { formatError } from "../../services/errors.js";
import { CanvasQuizAttemptInputSchema } from "../../schemas/consolidated.js";
import type { ClientResolver } from "../../transport/types.js";

const submissionMdFmt = new QuizSubmissionMarkdownFormatter();

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_quiz_attempt",
    {
      title: "Fluxo de Tentativa de Quiz (Consolidado)",
      description: `Tool consolidada para tentativa de quiz.

Actions:
- start: inicia ou recupera tentativa em andamento
- answer: envia resposta para uma questão
- complete: finaliza tentativa (irreversível)`,
      inputSchema: CanvasQuizAttemptInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const parsed = CanvasQuizAttemptInputSchema.parse(params);
      const { client } = resolveClient(extra.sessionId);
      const repo = new QuizzesRepository(client);

      if (parsed.action === "start") {
        const result = await repo.startAttempt(parsed.course_id, parsed.quiz_id, parsed.access_code);
        if (!result.ok) {
          return { content: [{ type: "text", text: formatError(result.error) }] };
        }

        const submission = result.value;
        return {
          content: [{ type: "text", text: submissionMdFmt.format(submission) }],
          structuredContent: submission as unknown as Record<string, unknown>,
        };
      }

      if (parsed.action === "answer") {
        if (parsed.question_type === "text_only_question") {
          return {
            content: [
              {
                type: "text",
                text: "Questão do tipo text_only não requer resposta: é apenas texto informativo.",
              },
            ],
          };
        }

        const result = await repo.answerQuestion(parsed.quiz_submission_id, {
          attempt: parsed.attempt,
          validationToken: parsed.validation_token,
          questionId: parsed.question_id,
          answer: parsed.answer,
        });

        if (!result.ok) {
          return { content: [{ type: "text", text: formatError(result.error) }] };
        }

        const answered = result.value[0];
        const text = [
          "Resposta registrada com sucesso!",
          `- Questão ID: ${parsed.question_id}`,
          `- Resposta: ${JSON.stringify(answered?.answer ?? parsed.answer)}`,
        ].join("\n");

        return {
          content: [{ type: "text", text }],
          structuredContent: { items: result.value } as Record<string, unknown>,
        };
      }

      const result = await repo.completeAttempt(parsed.course_id, parsed.quiz_id, parsed.submission_id, {
        attempt: parsed.attempt,
        validationToken: parsed.validation_token,
        accessCode: parsed.access_code,
      });

      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }

      const submission = result.value;
      return {
        content: [{ type: "text", text: `Tentativa concluída com sucesso!\n\n${submissionMdFmt.format(submission)}` }],
        structuredContent: submission as unknown as Record<string, unknown>,
      };
    }
  );
}
