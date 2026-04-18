#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClientFromEnv } from "./services/canvasClient.js";
import { registerAllTools } from "./tools/index.js";

async function main(): Promise<void> {
  const client = createClientFromEnv();

  const server = new McpServer({
    name: "canvas-mcp-server",
    version: "1.0.0",
  });

  registerAllTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(
    "[canvas-mcp-server] Servidor MCP iniciado via stdio. " +
      `Domínio: ${process.env.CANVAS_DOMAIN ?? "pucminas.instructure.com"}`
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[canvas-mcp-server] Erro fatal: ${message}`);
  process.exit(1);
});
