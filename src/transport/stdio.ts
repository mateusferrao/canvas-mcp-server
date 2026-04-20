import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClientFromEnv } from "../services/canvasClient.js";
import { DEFAULT_CANVAS_DOMAIN } from "../constants.js";
import { createServer } from "../server.js";
import type { ClientContext, ClientResolver, TransportBootstrap } from "./types.js";

/**
 * Stdio transport bootstrap — single-tenant mode.
 * Canvas token + domain come from environment variables (CANVAS_API_TOKEN, CANVAS_DOMAIN).
 * All requests share the same Canvas client (one process = one user).
 */
export class StdioTransport implements TransportBootstrap {
  async start(_deps?: { resolveClient?: ClientResolver }): Promise<void> {
    const canvasClient = createClientFromEnv();
    const token = process.env["CANVAS_API_TOKEN"] ?? "";
    const domain = process.env["CANVAS_DOMAIN"] ?? DEFAULT_CANVAS_DOMAIN;

    const context: ClientContext = { client: canvasClient, token, domain };
    const resolveClient: ClientResolver = () => context; // sessionId ignored

    const server = createServer({ resolveClient });
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error(
      "[canvas-mcp-server] Servidor MCP iniciado via stdio. " +
        `Domínio: ${domain}`
    );
  }

  async stop(): Promise<void> {
    // Stdio transport has no explicit stop (process exit handles cleanup)
  }
}
