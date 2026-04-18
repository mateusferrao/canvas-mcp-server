import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerAllTools } from "../../src/tools/index.js";
import { buildTestClient } from "./buildClient.js";

export async function buildInMemoryServer(): Promise<{
  client: Client;
  close: () => Promise<void>;
}> {
  const canvasClient = buildTestClient();
  const server = new McpServer({ name: "canvas-mcp-server-test", version: "0.0.1" });
  registerAllTools(server, canvasClient);

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
