#!/usr/bin/env node
import { StdioTransport } from "./transport/stdio.js";
import { startHttpServer } from "./transport/http.js";

async function main(): Promise<void> {
  const transport = process.env["MCP_TRANSPORT"]?.toLowerCase() ?? "http";

  if (transport === "stdio") {
    // ── Single-tenant: reads CANVAS_API_TOKEN from env ──────────────────────
    const stdio = new StdioTransport();
    await stdio.start();
    return;
  }

  // ── HTTP: multi-tenant ────────────────────────────────────────────────────
  const authToken = process.env["MCP_AUTH_TOKEN"];
  if (!authToken) {
    console.error(
      "[canvas-mcp-server] ERRO: MCP_AUTH_TOKEN não configurado. " +
        "Este token protege o endpoint HTTP do servidor MCP.\n" +
        "Gere um token seguro: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n" +
        "E configure: MCP_AUTH_TOKEN=<token_gerado>"
    );
    process.exit(1);
  }

  const allowedOriginsRaw = process.env["MCP_ALLOWED_ORIGINS"];
  const allowedOrigins = allowedOriginsRaw
    ? allowedOriginsRaw.split(",").map((o) => o.trim()).filter(Boolean)
    : undefined;

  const { stop } = await startHttpServer({
    authToken,
    allowedOrigins,
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    console.error(`[canvas-mcp-server] Shutdown iniciado (signal=${signal})`);
    try {
      await stop();
      process.exit(0);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[canvas-mcp-server] Falha no shutdown: ${message}`);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[canvas-mcp-server] Erro fatal: ${message}`);
  process.exit(1);
});
