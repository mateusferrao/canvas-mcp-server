import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";
import type { ClientResolver } from "./transport/types.js";

export interface ServerDeps {
  resolveClient: ClientResolver;
}

/**
 * Factory — creates and configures the McpServer with all tools registered.
 * Decoupled from transport: pass the configured server to any TransportBootstrap.
 */
export function createServer(deps: ServerDeps): McpServer {
  const server = new McpServer({
    name: "canvas-mcp-server",
    version: "1.0.0",
  });

  registerAllTools(server, deps.resolveClient);

  return server;
}
