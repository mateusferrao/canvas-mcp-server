import type { ICanvasClient } from "../services/canvasClient.js";

/**
 * Per-session client context — holds all session-specific Canvas credentials.
 * Resolved once per request handler invocation in HTTP mode;
 * returns the singleton in stdio mode.
 */
export interface ClientContext {
  client: ICanvasClient;
  token: string;
  domain: string;
}

/**
 * Adapter for resolving the correct Canvas client per session.
 *
 * - stdio: always returns the single env-based context (sessionId ignored).
 * - http:  looks up the session store by sessionId; throws if session unknown.
 *
 * @param sessionId - MCP session ID from RequestHandlerExtra (undefined in tests / in-memory transport).
 */
export type ClientResolver = (sessionId: string | undefined) => ClientContext;

/**
 * Strategy interface for transport bootstrap.
 * Implement to add a new transport (e.g., WebSocket, gRPC).
 */
export interface TransportBootstrap {
  start(deps: { resolveClient: ClientResolver }): Promise<void>;
  stop(): Promise<void>;
}
