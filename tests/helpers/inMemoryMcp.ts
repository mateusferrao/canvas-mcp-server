import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerAllTools } from "../../src/tools/index.js";
import { buildTestClient } from "./buildClient.js";
import type { ClientContext } from "../../src/transport/types.js";

export async function buildInMemoryServer(): Promise<{
  client: Client;
  close: () => Promise<void>;
}> {
  const canvasClient = buildTestClient();
  const context: ClientContext = {
    client: canvasClient,
    token: "test-token",
    domain: "pucminas.instructure.com",
  };

  const server = new McpServer({ name: "canvas-mcp-server-test", version: "0.0.1" });
  // Resolver always returns same test context (single-tenant in-memory mode)
  registerAllTools(server, (_sessionId) => context);

  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "0.0.1" });
  await client.connect(clientTransport);

  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}
