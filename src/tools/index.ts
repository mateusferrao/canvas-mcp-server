import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ClientResolver } from "../transport/types.js";
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
// Phase 4
import * as documents from "./documents.js";

/**
 * Registry — registra todos os tools no servidor MCP.
 * Adicionar novo domínio: importar + chamar .register() aqui.
 */
export function registerAllTools(
  server: McpServer,
  resolveClient: ClientResolver
): void {
  // Phase 1
  courses.register(server, resolveClient);
  assignments.register(server, resolveClient);
  submissions.register(server, resolveClient);
  todo.register(server, resolveClient);
  calendar.register(server, resolveClient);
  announcements.register(server, resolveClient);
  profile.register(server, resolveClient);
  // Phase 2
  modules.register(server, resolveClient);
  pages.register(server, resolveClient);
  discussions.register(server, resolveClient);
  conversations.register(server, resolveClient);
  planner.register(server, resolveClient);
  grades.register(server, resolveClient);
  quizzes.register(server, resolveClient);
  files.register(server, resolveClient);
  // Phase 4 — documents + OCR
  documents.register(server, resolveClient);
}
