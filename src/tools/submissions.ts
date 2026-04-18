import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SubmissionsRepository } from "../repositories/submissions.js";
import {
  SubmissionMarkdownFormatter,
  SubmissionJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import {
  PaginationSchema,
  ResponseFormatSchema,
  CourseIdSchema,
  AssignmentIdSchema,
} from "../schemas/common.js";
import { executeListTool, executeSingleTool } from "./base.js";
import { formatError } from "../services/errors.js";
import type { ICanvasClient } from "../services/canvasClient.js";

const ListSubmissionsSchema = z
  .object({
    course_id: CourseIdSchema,
    include_assignment: z.boolean().default(false).describe("Incluir dados da tarefa"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

const GetSubmissionSchema = z
  .object({
    course_id: CourseIdSchema,
    assignment_id: AssignmentIdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

const SubmitAssignmentSchema = z
  .object({
    course_id: CourseIdSchema,
    assignment_id: AssignmentIdSchema,
    submission_type: z
      .enum(["online_text_entry", "online_url", "online_upload"])
      .describe("Tipo de entrega: texto (online_text_entry), URL (online_url) ou arquivo (online_upload)"),
    body: z
      .string()
      .optional()
      .describe("Conteúdo HTML para online_text_entry"),
    url: z
      .string()
      .url()
      .optional()
      .describe("URL para online_url (deve ser http/https)"),
    file_ids: z
      .array(z.number().int().positive())
      .optional()
      .describe("IDs dos arquivos para online_upload. Use canvas_upload_file primeiro para obter os IDs."),
  })
  .strict();

export function register(server: McpServer, client: ICanvasClient): void {
  const repo = new SubmissionsRepository(client);
  const mdFmt = new SubmissionMarkdownFormatter();
  const jsonFmt = new SubmissionJsonFormatter();

  server.registerTool(
    "canvas_list_submissions",
    {
      title: "Listar Entregas Canvas",
      description: `Lista todas as entregas do aluno em um curso.

Args:
  - course_id: ID do curso
  - include_assignment: incluir dados da tarefa (default: false)
  - per_page: 1-100 (default: 25)
  - page: número da página
  - response_format: "markdown" | "json"

Retorna: lista de entregas com estado, nota e data de submissão.`,
      inputSchema: ListSubmissionsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeListTool(
        () => repo.list({
          courseId: params.course_id,
          include_assignment: params.include_assignment,
          per_page: params.per_page,
          page: params.page,
        }),
        fmt,
        params.response_format
      );
    }
  );

  server.registerTool(
    "canvas_get_submission",
    {
      title: "Obter Entrega Canvas",
      description: `Obtém a entrega do aluno para uma tarefa específica.

Args:
  - course_id: ID do curso
  - assignment_id: ID da tarefa
  - response_format: "markdown" | "json"

Retorna: detalhes da entrega incluindo nota, estado e conteúdo.`,
      inputSchema: GetSubmissionSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeSingleTool(
        () => repo.get(params.course_id, params.assignment_id),
        fmt
      );
    }
  );

  server.registerTool(
    "canvas_submit_assignment",
    {
      title: "Entregar Tarefa Canvas",
      description: `Entrega uma tarefa no Canvas LMS.

Tipos suportados:
  - online_text_entry: enviar texto HTML (use campo "body")
  - online_url: enviar link (use campo "url" com http/https)
  - online_upload: enviar arquivo(s) (use campo "file_ids" com IDs de canvas_upload_file)

Args:
  - course_id: ID do curso
  - assignment_id: ID da tarefa
  - submission_type: "online_text_entry" | "online_url"
  - body: conteúdo HTML (para online_text_entry)
  - url: URL válida (para online_url)

Retorna: confirmação da entrega com estado e ID.

ATENÇÃO: Esta operação envia uma entrega real no Canvas. Verifique os dados antes de confirmar.`,
      inputSchema: SubmitAssignmentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      const result = await repo.submit({
        courseId: params.course_id,
        assignmentId: params.assignment_id,
        submissionType: params.submission_type,
        body: params.body,
        url: params.url,
        fileIds: params.file_ids,
      });

      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }

      const s = result.value;
      const text = `Entrega realizada com sucesso!\n- ID: ${s.id}\n- Estado: ${s.workflow_state}\n- Enviado em: ${s.submitted_at ?? "agora"}`;

      return {
        content: [{ type: "text", text }],
        structuredContent: s as unknown as Record<string, unknown>,
      };
    }
  );
}
