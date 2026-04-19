import { z } from "zod";
import { ResponseFormat } from "../services/formatters.js";

export { ResponseFormat };

export const ResponseFormatSchema = z
  .nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Formato de saída: 'markdown' para leitura humana ou 'json' para processamento");

export const PaginationSchema = z.object({
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Itens por página (1-100)"),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("Número da página"),
});

export const CourseIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico do curso no Canvas");

export const AssignmentIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico da tarefa no Canvas");

export const ModuleIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico do módulo no Canvas");

export const ModuleItemIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico do item de módulo no Canvas");

export const TopicIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico do tópico de discussão no Canvas");

export const EntryIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico da entrada de discussão no Canvas");

export const ConversationIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico da conversa no Canvas");

export const PageIdOrUrlSchema = z
  .string()
  .min(1)
  .describe("URL slug ou ID numérico da página Canvas (ex: 'introducao-ao-curso' ou '42')");

export const QuizIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico do quiz no Canvas");

export const PlannerNoteIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico da nota do planejador no Canvas");

export const QuizSubmissionIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico da submissão de quiz no Canvas (retornado por canvas_start_quiz_attempt)");

export const QuizQuestionIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico da questão do quiz no Canvas");
