import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { buildInMemoryServer } from "../helpers/inMemoryMcp.js";

let client: Client;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ client, close } = await buildInMemoryServer());
});

afterAll(async () => {
  await close();
});

describe("MCP server — tools listing", () => {
  it("expõe exatamente 10 tools", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(10);

    const names = tools.map((tool) => tool.name).sort();
    expect(names).toEqual([
      "canvas_document",
      "canvas_get",
      "canvas_list",
      "canvas_manage_planner_note",
      "canvas_mark_module_item_done",
      "canvas_post_discussion_entry",
      "canvas_quiz_attempt",
      "canvas_send_message",
      "canvas_submit_assignment",
      "canvas_upload_file",
    ]);
  });

  it("todas as tools têm name, description e inputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });
});

describe("consolidated read tools", () => {
  it("canvas_get profile retorna perfil do usuário", async () => {
    const result = await client.callTool({
      name: "canvas_get",
      arguments: { kind: "profile", response_format: "markdown" },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("João da Silva");
    expect(text).toContain("joao.silva@sga.pucminas.br");
  });

  it("canvas_list courses retorna cursos", async () => {
    const result = await client.callTool({
      name: "canvas_list",
      arguments: { kind: "courses" },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Engenharia de Software");
    expect(text).toContain("Cálculo II");
  });
});

describe("standalone write tools", () => {
  it("canvas_submit_assignment realiza entrega de texto", async () => {
    const result = await client.callTool({
      name: "canvas_submit_assignment",
      arguments: {
        course_id: 101,
        assignment_id: 201,
        submission_type: "online_text_entry",
        body: "<p>Minha resposta de teste</p>",
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("sucesso");
  });
});
