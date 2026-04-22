import { randomUUID } from "node:crypto";
import express from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createClientFromToken } from "../services/canvasClient.js";
import { createServer } from "../server.js";
import { DEFAULT_CANVAS_DOMAIN } from "../constants.js";
import { bearerAuth, extractCanvasToken, extractCanvasDomain } from "./auth.js";
import type { ClientContext, ClientResolver, TransportBootstrap } from "./types.js";

// ── Session store ─────────────────────────────────────────────────────────────

interface Session {
  transport: StreamableHTTPServerTransport;
  context: ClientContext;
  lastSeen: number;
}

const SESSION_IDLE_MS =
  parseInt(process.env["SESSION_IDLE_MS"] ?? "0") || 30 * 60 * 1000; // 30 min

// ── HttpTransport ─────────────────────────────────────────────────────────────

export class HttpTransport implements TransportBootstrap {
  private httpServer: ReturnType<typeof import("node:http").createServer> | null = null;

  async start(_deps: { resolveClient: ClientResolver }): Promise<void> {
    // HttpTransport builds its own resolveClient from session store — _deps ignored
    throw new Error("Use startHttpServer() directly instead of TransportBootstrap.start()");
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (!this.httpServer) { resolve(); return; }
      this.httpServer.close((err) => err ? reject(err) : resolve());
    });
  }
}

export interface HttpServerConfig {
  port?: number;
  host?: string;
  authToken: string;
  allowedOrigins?: string[];
  defaultCanvasDomain?: string;
}

/**
 * Starts the Streamable HTTP MCP server.
 * Multi-tenant: each session gets its own Canvas client, bound at initialize time.
 *
 * Returns a stop function.
 */
export async function startHttpServer(config: HttpServerConfig): Promise<{ stop: () => Promise<void> }> {
  const port = config.port ?? parseInt(process.env["MCP_HTTP_PORT"] ?? "3000");
  const host = config.host ?? process.env["MCP_HTTP_HOST"] ?? "127.0.0.1";
  const defaultDomain = config.defaultCanvasDomain ?? DEFAULT_CANVAS_DOMAIN;

  // ── Session store ──────────────────────────────────────────────────────────
  const sessions = new Map<string, Session>();

  // GC idle sessions
  const gcInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastSeen > SESSION_IDLE_MS) {
        void session.transport.close().catch(() => { /* ignore */ });
        sessions.delete(id);
      }
    }
  }, Math.min(SESSION_IDLE_MS, 60_000));
  gcInterval.unref();

  // ── ClientResolver (looks up session store) ────────────────────────────────
  const resolveClient: ClientResolver = (sessionId) => {
    if (!sessionId) {
      // In-memory / test mode: return a placeholder; callers won't hit this in tests
      // since tests use buildInMemoryServer which passes its own resolveClient.
      throw new Error("No sessionId — cannot resolve Canvas client in HTTP mode");
    }
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    session.lastSeen = Date.now();
    return session.context;
  };

  // ── MCP server factory ─────────────────────────────────────────────────────
  const mcpServer = createServer({ resolveClient });

  // ── Express app (DNS rebinding protection built-in for loopback) ───────────
  const app = createMcpExpressApp({ host });

  // Liveness endpoint for container health checks.
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Middleware: bearer auth for MCP endpoint
  app.use("/mcp", bearerAuth(config.authToken));

  // Body parser (for JSON-RPC bodies)
  app.use(express.json());

  // ── Streamable HTTP endpoint ───────────────────────────────────────────────
  app.all("/mcp", async (req, res) => {
    const isInitialize = req.method === "POST" &&
      typeof req.body === "object" &&
      req.body?.method === "initialize";

    // On initialize: require X-Canvas-Token and bind session
    if (isInitialize) {
      const canvasToken = extractCanvasToken(req);
      if (!canvasToken) {
        res.status(400).json({ error: "Missing X-Canvas-Token header — required for Canvas authentication" });
        return;
      }
      const domain = extractCanvasDomain(req, defaultDomain);
      const sessionId = randomUUID();

      // Validate Canvas token with a lightweight call
      let canvasClient;
      try {
        canvasClient = createClientFromToken(canvasToken, domain);
        const selfResult = await canvasClient.get("/users/self");
        if (!selfResult.ok) {
          res.status(401).json({ error: `Invalid Canvas token: ${selfResult.error.message}` });
          return;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        res.status(400).json({ error: `Canvas client error: ${msg}` });
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId,
      });

      const context: ClientContext = { client: canvasClient, token: canvasToken, domain };
      sessions.set(sessionId, { transport, context, lastSeen: Date.now() });

      // Connect transport to MCP server
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // Non-initialize: look up existing session
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({ error: "Missing or unknown Mcp-Session-Id — call initialize first" });
      return;
    }
    const session = sessions.get(sessionId)!;
    session.lastSeen = Date.now();

    // DELETE /mcp — clean up session
    if (req.method === "DELETE") {
      await session.transport.close().catch(() => { /* ignore */ });
      sessions.delete(sessionId);
      res.status(200).json({ ok: true });
      return;
    }

    await session.transport.handleRequest(req, res, req.body);
  });

  // ── Start listening ────────────────────────────────────────────────────────
  const server = await new Promise<ReturnType<typeof import("node:http").createServer>>((resolve, reject) => {
    const s = app.listen(port, host, () => resolve(s));
    s.on("error", reject);
  });

  const allowedOriginsMsg = config.allowedOrigins?.length
    ? ` Allowed origins: ${config.allowedOrigins.join(", ")}.`
    : "";
  console.error(`[canvas-mcp-server] HTTP transport listening on http://${host}:${port}/mcp${allowedOriginsMsg}`);

  return {
    stop: () =>
      new Promise<void>((resolve, reject) => {
        clearInterval(gcInterval);
        server.close((err) => err ? reject(err) : resolve());
      }),
  };
}
