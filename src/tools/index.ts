import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ClientResolver } from "../transport/types.js";
import * as list from "./consolidated/list.js";
import * as get from "./consolidated/get.js";
import * as document from "./consolidated/document.js";
import * as quizAttempt from "./consolidated/quizAttempt.js";
import * as submitAssignment from "./writes/submitAssignment.js";
import * as markModuleItemDone from "./writes/markModuleItemDone.js";
import * as postDiscussionEntry from "./writes/postDiscussionEntry.js";
import * as sendMessage from "./writes/sendMessage.js";
import * as managePlannerNote from "./writes/managePlannerNote.js";
import * as uploadFile from "./writes/uploadFile.js";

/**
 * Registry — registra todos os tools no servidor MCP.
 * Adicionar novo domínio: importar + chamar .register() aqui.
 */
export function registerAllTools(
  server: McpServer,
  resolveClient: ClientResolver
): void {
  list.register(server, resolveClient);
  get.register(server, resolveClient);
  document.register(server, resolveClient);
  quizAttempt.register(server, resolveClient);
  submitAssignment.register(server, resolveClient);
  markModuleItemDone.register(server, resolveClient);
  postDiscussionEntry.register(server, resolveClient);
  sendMessage.register(server, resolveClient);
  managePlannerNote.register(server, resolveClient);
  uploadFile.register(server, resolveClient);
}
