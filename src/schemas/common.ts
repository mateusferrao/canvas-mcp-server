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
