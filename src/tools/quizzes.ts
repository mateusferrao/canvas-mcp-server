import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { QuizzesRepository } from "../repositories/quizzes.js";
import {
  QuizMarkdownFormatter,
  QuizJsonFormatter,
  QuizQuestionMarkdownFormatter,
  QuizQuestionJsonFormatter,
  QuizSubmissionMarkdownFormatter,
  QuizSubmissionJsonFormatter,
  QuizSubmissionQuestionMarkdownFormatter,
  QuizSubmissionQuestionJsonFormatter,
  QuizTimeLeftMarkdownFormatter,
  QuizTimeLeftJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import {
  PaginationSchema,
  ResponseFormatSchema,
  CourseIdSchema,
  QuizIdSchema,
  QuizSubmissionIdSchema,
  QuizQuestionIdSchema,
} from "../schemas/common.js";
import { executeListTool, executeSingleTool } from "./base.js";
import { formatError } from "../services/errors.js";
import type { ClientResolver } from "../transport/types.js";

// ── Schemas ───────────────────────────────────────────────────────────────────

const ListQuizzesSchema = z
  .object({
    course_id: CourseIdSchema,
    search_term: z.string().optional().describe("Filtrar por título"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

const GetQuizSchema = z
  .object({
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

const ListQuestionsSchema = z
  .object({
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    quiz_submission_id: QuizSubmissionIdSchema.optional().describe(
      "ID da tentativa (opcional). Se fornecido junto com attempt, retorna questões exatas daquela tentativa."
    ),
    attempt: z
      .coerce
      .number()
      .int()
      .positive()
      .optional()
      .describe("Número da tentativa (usar junto com quiz_submission_id)"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

const StartAttemptSchema = z
  .object({
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    access_code: z
      .string()
      .optional()
      .describe("Código de acesso, se o quiz exigir"),
  })
  .strict();

const GetSubmissionQuestionsSchema = z
  .object({
    quiz_submission_id: QuizSubmissionIdSchema,
    include_quiz_question: z
      .boolean()
      .optional()
      .default(false)
      .describe("Incluir dados completos da questão (enunciado, opções)"),
    response_format: ResponseFormatSchema,
  })
  .strict();

// Discriminated union by question_type for answer validation
const answerBaseFields = {
  quiz_submission_id: QuizSubmissionIdSchema,
  attempt: z.coerce.number().int().positive().describe("Número da tentativa (retornado por canvas_start_quiz_attempt)"),
  validation_token: z.string().min(1).describe("Token de validação (retornado por canvas_start_quiz_attempt)"),
  question_id: QuizQuestionIdSchema,
};

const AnswerQuizQuestionSchema = z.discriminatedUnion("question_type", [
  z.object({ ...answerBaseFields, question_type: z.literal("multiple_choice_question"), answer: z.coerce.number().describe("ID da opção de resposta") }),
  z.object({ ...answerBaseFields, question_type: z.literal("true_false_question"), answer: z.coerce.number().describe("ID da opção (verdadeiro ou falso)") }),
  z.object({ ...answerBaseFields, question_type: z.literal("short_answer_question"), answer: z.string().describe("Texto da resposta (≤16KB)") }),
  z.object({ ...answerBaseFields, question_type: z.literal("essay_question"), answer: z.string().describe("HTML da resposta (≤16KB)") }),
  z.object({ ...answerBaseFields, question_type: z.literal("multiple_answers_question"), answer: z.array(z.coerce.number()).describe("Array de IDs das opções selecionadas") }),
  z.object({ ...answerBaseFields, question_type: z.literal("multiple_dropdowns_question"), answer: z.record(z.string(), z.number()).describe('Mapa de blank_name → answer_id (ex: {"color": 6})') }),
  z.object({ ...answerBaseFields, question_type: z.literal("fill_in_multiple_blanks_question"), answer: z.record(z.string(), z.string()).describe('Mapa de blank_name → texto (ex: {"color1": "azul"})') }),
  z.object({ ...answerBaseFields, question_type: z.literal("matching_question"), answer: z.array(z.object({ answer_id: z.number(), match_id: z.number() })).describe("Array de { answer_id, match_id }") }),
  z.object({ ...answerBaseFields, question_type: z.literal("numerical_question"), answer: z.string().describe("Número como string (ex: '13.4')") }),
  z.object({ ...answerBaseFields, question_type: z.literal("calculated_question"), answer: z.string().describe("Número como string") }),
  z.object({ ...answerBaseFields, question_type: z.literal("file_upload_question"), answer: z.array(z.number()).describe("Array de attachment IDs (use canvas_upload_file primeiro)") }),
  z.object({ ...answerBaseFields, question_type: z.literal("text_only_question"), answer: z.undefined().describe("Questão de exibição apenas — sem resposta necessária") }),
]);

const CompleteAttemptSchema = z
  .object({
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    submission_id: QuizSubmissionIdSchema,
    attempt: z.coerce.number().int().positive().describe("Número da tentativa (retornado por canvas_start_quiz_attempt)"),
    validation_token: z.string().min(1).describe("Token de validação (retornado por canvas_start_quiz_attempt)"),
    access_code: z.string().optional().describe("Código de acesso, se o quiz exigir"),
  })
  .strict();

const ListSubmissionsSchema = z
  .object({
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

const GetSubmissionSchema = z
  .object({
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    submission_id: QuizSubmissionIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

const GetTimeLeftSchema = z
  .object({
    course_id: CourseIdSchema,
    quiz_id: QuizIdSchema,
    submission_id: QuizSubmissionIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

// ── Formatters (stateless — safe to share across sessions) ───────────────────

const mdFmt = new QuizMarkdownFormatter();
const jsonFmt = new QuizJsonFormatter();
const qMdFmt = new QuizQuestionMarkdownFormatter();
const qJsonFmt = new QuizQuestionJsonFormatter();
const sMdFmt = new QuizSubmissionMarkdownFormatter();
const sJsonFmt = new QuizSubmissionJsonFormatter();
const sqMdFmt = new QuizSubmissionQuestionMarkdownFormatter();
const sqJsonFmt = new QuizSubmissionQuestionJsonFormatter();
const tMdFmt = new QuizTimeLeftMarkdownFormatter();
const tJsonFmt = new QuizTimeLeftJsonFormatter();

// ── Register ──────────────────────────────────────────────────────────────────

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_list_quizzes",
    {
      title: "Listar Quizzes Canvas",
      description: `Lista os quizzes de um curso no Canvas.

Args:
  - course_id: ID do curso
  - search_term: filtrar por título (opcional)
  - per_page: 1-100 (default: 25)
  - page: número da página
  - response_format: "markdown" | "json"

Retorna: quizzes com prazo, pontos e número de questões.`,
      inputSchema: ListQuizzesSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new QuizzesRepository(client);
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeListTool(
        () => repo.list(params.course_id, { per_page: params.per_page, page: params.page, search_term: params.search_term }),
        fmt,
        params.response_format
      );
    }
  );

  server.registerTool(
    "canvas_get_quiz",
    {
      title: "Obter Quiz Canvas",
      description: `Obtém os detalhes de um quiz específico.

Args:
  - course_id: ID do curso
  - quiz_id: ID do quiz
  - response_format: "markdown" | "json"

Retorna: detalhes do quiz (tipo, questões, tempo, tentativas, prazo).`,
      inputSchema: GetQuizSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new QuizzesRepository(client);
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeSingleTool(() => repo.get(params.course_id, params.quiz_id), fmt);
    }
  );

  server.registerTool(
    "canvas_list_quiz_questions",
    {
      title: "Listar Questões do Quiz Canvas",
      description: `Lista as questões de um quiz, incluindo enunciado, tipo e opções de resposta.

Args:
  - course_id: ID do curso
  - quiz_id: ID do quiz
  - quiz_submission_id: ID da tentativa (opcional)
  - attempt: número da tentativa (opcional, usar com quiz_submission_id)
  - per_page: 1-100 (default: 25)
  - response_format: "markdown" | "json"

Retorna: questões com tipo, pontos e opções de resposta.`,
      inputSchema: ListQuestionsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new QuizzesRepository(client);
      const fmt = selectFormatter(params.response_format, qMdFmt, qJsonFmt);
      return executeListTool(
        () => repo.listQuestions(params.course_id, params.quiz_id, {
          quiz_submission_id: params.quiz_submission_id,
          quiz_submission_attempt: params.attempt,
          per_page: params.per_page,
          page: params.page,
        }),
        fmt,
        params.response_format
      );
    }
  );

  server.registerTool(
    "canvas_start_quiz_attempt",
    {
      title: "Iniciar Tentativa de Quiz Canvas",
      description: `Inicia uma nova tentativa de quiz no Canvas. Se já houver uma tentativa não concluída, recupera a existente.

Args:
  - course_id: ID do curso
  - quiz_id: ID do quiz
  - access_code: código de acesso, se o quiz exigir (opcional)

Retorna: dados da tentativa incluindo submission_id, attempt e validation_token.

ATENÇÃO: O timer começa ao chamar esta ferramenta. Guarde o validation_token e o attempt retornados — eles são necessários para responder questões e submeter.`,
      inputSchema: StartAttemptSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new QuizzesRepository(client);
      const result = await repo.startAttempt(params.course_id, params.quiz_id, params.access_code);
      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }
      const s = result.value;
      const text = sMdFmt.format(s);
      return { content: [{ type: "text", text }], structuredContent: s as unknown as Record<string, unknown> };
    }
  );

  server.registerTool(
    "canvas_get_quiz_submission_questions",
    {
      title: "Obter Questões da Tentativa de Quiz Canvas",
      description: `Obtém as questões de uma tentativa de quiz em andamento.

Args:
  - quiz_submission_id: ID da tentativa (retornado por canvas_start_quiz_attempt)
  - include_quiz_question: incluir dados completos da questão — default: false
  - response_format: "markdown" | "json"

Retorna: questões com estado atual de resposta.`,
      inputSchema: GetSubmissionQuestionsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new QuizzesRepository(client);
      const result = await repo.getSubmissionQuestions(params.quiz_submission_id, params.include_quiz_question);
      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }
      const fmt = selectFormatter(params.response_format, sqMdFmt, sqJsonFmt);
      const text = fmt.formatList(result.value, result.value.length);
      return { content: [{ type: "text", text }], structuredContent: { items: result.value } as unknown as Record<string, unknown> };
    }
  );

  server.registerTool(
    "canvas_answer_quiz_question",
    {
      title: "Responder Questão de Quiz Canvas",
      description: `Registra a resposta a uma questão de quiz em andamento.

Args:
  - quiz_submission_id, attempt, validation_token: retornados por canvas_start_quiz_attempt
  - question_id: ID da questão
  - question_type: tipo da questão (determina formato de answer)
  - answer: resposta no formato correto para o question_type

ATENÇÃO: Esta operação altera o estado do quiz no Canvas.`,
      inputSchema: AnswerQuizQuestionSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (params, extra) => {
      if (params.question_type === "text_only_question") {
        return { content: [{ type: "text", text: "Questão do tipo text_only não requer resposta — é apenas exibição de texto." }] };
      }
      const { client } = resolveClient(extra.sessionId);
      const repo = new QuizzesRepository(client);
      const result = await repo.answerQuestion(params.quiz_submission_id, {
        attempt: params.attempt,
        validationToken: params.validation_token,
        questionId: params.question_id,
        answer: params.answer,
      });
      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }
      const answered = result.value[0];
      const text = `Resposta registrada com sucesso!\n- Questão ID: ${params.question_id}\n- Resposta: ${JSON.stringify(answered?.answer ?? params.answer)}`;
      return { content: [{ type: "text", text }], structuredContent: { items: result.value } as unknown as Record<string, unknown> };
    }
  );

  server.registerTool(
    "canvas_complete_quiz_attempt",
    {
      title: "Completar Tentativa de Quiz Canvas",
      description: `Finaliza e submete uma tentativa de quiz.

Args:
  - course_id, quiz_id: IDs do contexto
  - submission_id, attempt, validation_token: retornados por canvas_start_quiz_attempt
  - access_code: código de acesso (opcional)

**ATENÇÃO: OPERAÇÃO IRREVERSÍVEL — after this call, answers cannot be edited.** Confirme antes de prosseguir.`,
      inputSchema: CompleteAttemptSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new QuizzesRepository(client);
      const result = await repo.completeAttempt(params.course_id, params.quiz_id, params.submission_id, {
        attempt: params.attempt,
        validationToken: params.validation_token,
        accessCode: params.access_code,
      });
      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }
      const s = result.value;
      const text = `Tentativa concluída com sucesso!\n\n${sMdFmt.format(s)}`;
      return { content: [{ type: "text", text }], structuredContent: s as unknown as Record<string, unknown> };
    }
  );

  server.registerTool(
    "canvas_list_quiz_submissions",
    {
      title: "Listar Tentativas de Quiz Canvas",
      description: `Lista o histórico de tentativas do usuário em um quiz.

Args:
  - course_id: ID do curso
  - quiz_id: ID do quiz
  - response_format: "markdown" | "json"

Retorna: lista de tentativas com nota, estado e datas.`,
      inputSchema: ListSubmissionsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new QuizzesRepository(client);
      const result = await repo.listSubmissions(params.course_id, params.quiz_id);
      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }
      const fmt = selectFormatter(params.response_format, sMdFmt, sJsonFmt);
      const text = fmt.formatList(result.value, result.value.length);
      return { content: [{ type: "text", text }], structuredContent: { items: result.value } as unknown as Record<string, unknown> };
    }
  );

  server.registerTool(
    "canvas_get_quiz_submission",
    {
      title: "Obter Tentativa de Quiz Canvas",
      description: `Obtém os detalhes de uma tentativa específica de quiz, incluindo nota final.

Args:
  - course_id: ID do curso
  - quiz_id: ID do quiz
  - submission_id: ID da tentativa
  - response_format: "markdown" | "json"

Retorna: detalhes da tentativa com nota, tempo gasto e estado.`,
      inputSchema: GetSubmissionSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new QuizzesRepository(client);
      const fmt = selectFormatter(params.response_format, sMdFmt, sJsonFmt);
      return executeSingleTool(() => repo.getSubmission(params.course_id, params.quiz_id, params.submission_id), fmt);
    }
  );

  server.registerTool(
    "canvas_get_quiz_time_left",
    {
      title: "Obter Tempo Restante do Quiz Canvas",
      description: `Obtém o tempo restante de uma tentativa de quiz em andamento.

Args:
  - course_id: ID do curso
  - quiz_id: ID do quiz
  - submission_id: ID da tentativa (retornado por canvas_start_quiz_attempt)
  - response_format: "markdown" | "json"

Retorna: tempo restante em segundos e horário de expiração.`,
      inputSchema: GetTimeLeftSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new QuizzesRepository(client);
      const fmt = selectFormatter(params.response_format, tMdFmt, tJsonFmt);
      return executeSingleTool(() => repo.getTimeLeft(params.course_id, params.quiz_id, params.submission_id), fmt);
    }
  );
}
