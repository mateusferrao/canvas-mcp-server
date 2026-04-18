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
import type { ICanvasClient } from "../services/canvasClient.js";

const GetProfileSchema = z
  .object({
    response_format: ResponseFormatSchema,
  })
  .strict();

export function register(server: McpServer, client: ICanvasClient): void {
  const repo = new ProfileRepository(client);

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
    async (params) => {
      const fmt = selectFormatter(
        params.response_format,
        new UserMarkdownFormatter(),
        new UserJsonFormatter()
      );
      return executeSingleTool(() => repo.getSelf(), fmt);
    }
  );
}
