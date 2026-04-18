import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ICanvasClient } from "../services/canvasClient.js";
import * as courses from "./courses.js";
import * as assignments from "./assignments.js";
import * as submissions from "./submissions.js";
import * as todo from "./todo.js";
import * as calendar from "./calendar.js";
import * as announcements from "./announcements.js";
import * as profile from "./profile.js";

/**
 * Registry — registra todos os tools no servidor MCP.
 * Adicionar novo domínio: importar + chamar .register() aqui.
 */
export function registerAllTools(
  server: McpServer,
  client: ICanvasClient
): void {
  courses.register(server, client);
  assignments.register(server, client);
  submissions.register(server, client);
  todo.register(server, client);
  calendar.register(server, client);
  announcements.register(server, client);
  profile.register(server, client);
}
