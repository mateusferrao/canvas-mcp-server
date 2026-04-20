import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ModulesRepository } from "../repositories/modules.js";
import {
  ModuleMarkdownFormatter,
  ModuleJsonFormatter,
  ModuleItemMarkdownFormatter,
  ModuleItemJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import {
  PaginationSchema,
  ResponseFormatSchema,
  CourseIdSchema,
  ModuleIdSchema,
  ModuleItemIdSchema,
} from "../schemas/common.js";
import { executeListTool } from "./base.js";
import { formatError } from "../services/errors.js";
import type { ClientResolver } from "../transport/types.js";

const ListModulesSchema = z
  .object({
    course_id: CourseIdSchema,
    include_items: z
      .boolean()
      .default(false)
      .describe("Incluir itens de cada módulo na resposta (default: false)"),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

const ListModuleItemsSchema = z
  .object({
    course_id: CourseIdSchema,
    module_id: ModuleIdSchema,
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

const MarkModuleItemDoneSchema = z
  .object({
    course_id: CourseIdSchema,
    module_id: ModuleIdSchema,
    item_id: ModuleItemIdSchema,
  })
  .strict();

const mdFmt = new ModuleMarkdownFormatter();
const jsonFmt = new ModuleJsonFormatter();
const mdItemFmt = new ModuleItemMarkdownFormatter();
const jsonItemFmt = new ModuleItemJsonFormatter();

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_list_modules",
    {
      title: "Listar Módulos Canvas",
      description: `Lista os módulos de um curso no Canvas.

Args:
  - course_id: ID do curso
  - include_items: incluir itens de cada módulo (default: false)
  - per_page: 1-100 (default: 25)
  - page: número da página
  - response_format: "markdown" | "json"

Retorna: módulos com estado de progresso (active, completed, etc).`,
      inputSchema: ListModulesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new ModulesRepository(client);
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeListTool(
        () =>
          repo.list(params.course_id, {
            includeItems: params.include_items,
            per_page: params.per_page,
            page: params.page,
          }),
        fmt,
        params.response_format
      );
    }
  );

  server.registerTool(
    "canvas_list_module_items",
    {
      title: "Listar Itens de Módulo Canvas",
      description: `Lista os itens de um módulo específico.

Args:
  - course_id: ID do curso
  - module_id: ID do módulo
  - per_page: 1-100 (default: 25)
  - page: número da página
  - response_format: "markdown" | "json"

Retorna: itens (páginas, tarefas, quizzes, links externos) com requisitos de conclusão.`,
      inputSchema: ListModuleItemsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new ModulesRepository(client);
      const fmt = selectFormatter(params.response_format, mdItemFmt, jsonItemFmt);
      return executeListTool(
        () =>
          repo.listItems(params.course_id, params.module_id, {
            per_page: params.per_page,
            page: params.page,
          }),
        fmt,
        params.response_format
      );
    }
  );

  server.registerTool(
    "canvas_mark_module_item_done",
    {
      title: "Marcar Item de Módulo como Concluído",
      description: `Marca um item de módulo como concluído no Canvas.

Args:
  - course_id: ID do curso
  - module_id: ID do módulo
  - item_id: ID do item de módulo

Retorna: confirmação da marcação. Idempotente — chamar novamente não causa problemas.`,
      inputSchema: MarkModuleItemDoneSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new ModulesRepository(client);
      const result = await repo.markItemDone(
        params.course_id,
        params.module_id,
        params.item_id
      );

      if (!result.ok) {
        return { content: [{ type: "text", text: formatError(result.error) }] };
      }

      return {
        content: [
          {
            type: "text",
            text: `Item ${params.item_id} do módulo ${params.module_id} marcado como concluído.`,
          },
        ],
      };
    }
  );
}
