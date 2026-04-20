import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProfileRepository } from "../repositories/profile.js";
import {
  UserMarkdownFormatter,
  UserJsonFormatter,
  selectFormatter,
} from "../services/formatters.js";
import { ResponseFormatSchema } from "../schemas/common.js";
import { executeSingleTool } from "./base.js";
import type { ClientResolver } from "../transport/types.js";

const GetProfileSchema = z
  .object({
    response_format: ResponseFormatSchema,
  })
  .strict();

const mdFmt = new UserMarkdownFormatter();
const jsonFmt = new UserJsonFormatter();

export function register(server: McpServer, resolveClient: ClientResolver): void {
  server.registerTool(
    "canvas_get_profile",
    {
      title: "Obter Perfil Canvas",
      description: `Retorna o perfil do usuário autenticado no Canvas.

Inclui nome, login, email e ID do usuário.

Args:
  - response_format: "markdown" | "json" (default: "markdown")

Retorna: dados do perfil do aluno logado.`,
      inputSchema: GetProfileSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params, extra) => {
      const { client } = resolveClient(extra.sessionId);
      const repo = new ProfileRepository(client);
      const fmt = selectFormatter(params.response_format, mdFmt, jsonFmt);
      return executeSingleTool(() => repo.getSelf(), fmt);
    }
  );
}
