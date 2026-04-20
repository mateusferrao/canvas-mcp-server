import { z } from "zod";
import { ResponseFormatSchema, CourseIdSchema, PaginationSchema } from "./common.js";

export { ResponseFormatSchema };

export const FileIdSchema = z
  .number()
  .int()
  .positive()
  .describe("ID numérico do arquivo no Canvas");

// ── canvas_list_files ─────────────────────────────────────────────────────────

export const ListFilesSchema = z
  .object({
    course_id: CourseIdSchema,
    content_types: z
      .array(z.string())
      .optional()
      .describe("Filtrar por MIME type (ex: ['application/pdf', 'image/png'])"),
    search_term: z
      .string()
      .max(200)
      .optional()
      .describe("Busca por nome parcial do arquivo"),
    sort: z
      .enum(["name", "created_at", "updated_at", "content_type", "user"])
      .optional()
      .describe("Campo de ordenação"),
    order: z
      .enum(["asc", "desc"])
      .optional()
      .describe("Direção da ordenação"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

// ── canvas_get_file ───────────────────────────────────────────────────────────

export const GetFileSchema = z
  .object({
    file_id: FileIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

// ── canvas_download_file ──────────────────────────────────────────────────────

export const DownloadFileSchema = z
  .object({
    file_id: FileIdSchema,
  })
  .strict();

// ── canvas_extract_document_text ──────────────────────────────────────────────

export const ExtractDocumentTextSchema = z
  .object({
    file_id: FileIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

// ── canvas_resolve_task_files ─────────────────────────────────────────────────

export const ResolveTaskFilesSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("assignment"),
    course_id: CourseIdSchema,
    id: z.number().int().positive().describe("ID da tarefa"),
    response_format: ResponseFormatSchema,
  }),
  z.object({
    kind: z.literal("page"),
    course_id: CourseIdSchema,
    id: z.number().int().positive().describe("ID da página"),
    response_format: ResponseFormatSchema,
  }),
  z.object({
    kind: z.literal("discussion"),
    course_id: CourseIdSchema,
    id: z.number().int().positive().describe("ID do tópico de discussão"),
    response_format: ResponseFormatSchema,
  }),
]);
