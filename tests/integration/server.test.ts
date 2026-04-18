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
  it("expõe 13 tools registradas", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(13);
  });

  it("todas as tools têm name, description e inputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it("inclui canvas_get_profile", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("canvas_get_profile");
  });

  it("inclui canvas_submit_assignment", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("canvas_submit_assignment");
  });
});

describe("canvas_get_profile", () => {
  it("retorna perfil do usuário em markdown", async () => {
    const result = await client.callTool({
      name: "canvas_get_profile",
      arguments: { response_format: "markdown" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("João da Silva");
    expect(text).toContain("joao.silva@sga.pucminas.br");
  });

  it("retorna perfil em JSON quando solicitado", async () => {
    const result = await client.callTool({
      name: "canvas_get_profile",
      arguments: { response_format: "json" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.id).toBe(999);
  });
});

describe("canvas_list_courses", () => {
  it("retorna cursos ativos em markdown", async () => {
    const result = await client.callTool({
      name: "canvas_list_courses",
      arguments: {},
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Engenharia de Software");
    expect(text).toContain("Cálculo II");
  });

  it("retorna cursos em JSON quando solicitado", async () => {
    const result = await client.callTool({
      name: "canvas_list_courses",
      arguments: { response_format: "json" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed).toHaveProperty("items");
    expect(Array.isArray(parsed.items)).toBe(true);
  });
});

describe("canvas_list_assignments", () => {
  it("retorna tarefas do curso 101", async () => {
    const result = await client.callTool({
      name: "canvas_list_assignments",
      arguments: { course_id: 101 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Trabalho 1");
  });
});

describe("canvas_list_todo", () => {
  it("retorna pendências do aluno", async () => {
    const result = await client.callTool({
      name: "canvas_list_todo",
      arguments: {},
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Exercício de Cálculo 5");
  });
});

describe("canvas_get_submission", () => {
  it("retorna entrega existente", async () => {
    const result = await client.callTool({
      name: "canvas_get_submission",
      arguments: { course_id: 101, assignment_id: 201 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("graded");
    expect(text).toContain("9,50");
  });
});

describe("canvas_submit_assignment", () => {
  it("realiza entrega de texto com sucesso", async () => {
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
