import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ICanvasClient } from "../services/canvasClient.js";
import * as courses from "./courses.js";
import * as assignments from "./assignments.js";
import * as submissions from "./submissions.js";
import * as todo from "./todo.js";
import * as calendar from "./calendar.js";
import * as announcements from "./announcements.js";
import * as profile from "./profile.js";
// Phase 2
import * as modules from "./modules.js";
import * as pages from "./pages.js";
import * as discussions from "./discussions.js";
import * as conversations from "./conversations.js";
import * as planner from "./planner.js";
import * as grades from "./grades.js";
import * as quizzes from "./quizzes.js";
import * as files from "./files.js";

/**
 * Registry — registra todos os tools no servidor MCP.
 * Adicionar novo domínio: importar + chamar .register() aqui.
 */
export function registerAllTools(
  server: McpServer,
  client: ICanvasClient
): void {
  // Phase 1
  courses.register(server, client);
  assignments.register(server, client);
  submissions.register(server, client);
  todo.register(server, client);
  calendar.register(server, client);
  announcements.register(server, client);
  profile.register(server, client);
  // Phase 2
  modules.register(server, client);
  pages.register(server, client);
  discussions.register(server, client);
  conversations.register(server, client);
  planner.register(server, client);
  grades.register(server, client);
  quizzes.register(server, client);
  files.register(server, client);
}
