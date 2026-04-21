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

describe("canvas_list consolidated — phase 2 kinds", () => {
  it("modules", async () => {
    const result = await client.callTool({
      name: "canvas_list",
      arguments: { kind: "modules", course_id: 101 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Módulo 1: Introdução");
  });

  it("module_items", async () => {
    const result = await client.callTool({
      name: "canvas_list",
      arguments: { kind: "module_items", course_id: 101, module_id: 301 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Apresentação do Curso");
  });

  it("pages", async () => {
    const result = await client.callTool({
      name: "canvas_list",
      arguments: { kind: "pages", course_id: 101 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Introdução ao Curso");
  });

  it("discussions", async () => {
    const result = await client.callTool({
      name: "canvas_list",
      arguments: { kind: "discussions", course_id: 101 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Dúvidas sobre o Trabalho 1");
  });

  it("conversations", async () => {
    const result = await client.callTool({
      name: "canvas_list",
      arguments: { kind: "conversations" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Dúvida sobre nota");
  });

  it("planner_notes", async () => {
    const result = await client.callTool({
      name: "canvas_list",
      arguments: { kind: "planner_notes" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Estudar para P2");
  });

  it("quizzes", async () => {
    const result = await client.callTool({
      name: "canvas_list",
      arguments: { kind: "quizzes", course_id: 101 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Quiz 1: Conceitos Básicos");
  });

  it("files", async () => {
    const result = await client.callTool({
      name: "canvas_list",
      arguments: { kind: "files", course_id: 101 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("test-file.pdf");
  });
});

describe("canvas_get consolidated — phase 2 kinds", () => {
  it("page_content", async () => {
    const result = await client.callTool({
      name: "canvas_get",
      arguments: {
        kind: "page_content",
        course_id: 101,
        page_url_or_id: "introducao-ao-curso",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Bem-vindo");
  });

  it("discussion", async () => {
    const result = await client.callTool({
      name: "canvas_get",
      arguments: { kind: "discussion", course_id: 101, topic_id: 601 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Dúvidas sobre o Trabalho 1");
  });

  it("conversation", async () => {
    const result = await client.callTool({
      name: "canvas_get",
      arguments: { kind: "conversation", conversation_id: 801 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Dúvida sobre nota");
  });

  it("course_grades", async () => {
    const result = await client.callTool({
      name: "canvas_get",
      arguments: { kind: "course_grades", course_id: 101 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("87.5");
  });

  it("quiz", async () => {
    const result = await client.callTool({
      name: "canvas_get",
      arguments: { kind: "quiz", course_id: 101, quiz_id: 1001 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Quiz 1: Conceitos Básicos");
  });

  it("file", async () => {
    const result = await client.callTool({
      name: "canvas_get",
      arguments: { kind: "file", file_id: 5001 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("test-file.pdf");
  });
});

describe("standalone writes — phase 2", () => {
  it("canvas_mark_module_item_done", async () => {
    const result = await client.callTool({
      name: "canvas_mark_module_item_done",
      arguments: { course_id: 101, module_id: 301, item_id: 1001 },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("concluído");
  });

  it("canvas_post_discussion_entry", async () => {
    const result = await client.callTool({
      name: "canvas_post_discussion_entry",
      arguments: {
        course_id: 101,
        topic_id: 601,
        message: "<p>Meu comentário</p>",
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("sucesso");
  });

  it("canvas_send_message", async () => {
    const result = await client.callTool({
      name: "canvas_send_message",
      arguments: {
        mode: "reply",
        conversation_id: 801,
        body: "Obrigado pela resposta!",
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("sucesso");
  });

  it("canvas_manage_planner_note", async () => {
    const result = await client.callTool({
      name: "canvas_manage_planner_note",
      arguments: {
        action: "create",
        title: "Nova nota",
        todo_date: "2024-07-01",
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("902");
  });

  it("canvas_upload_file", async () => {
    const result = await client.callTool({
      name: "canvas_upload_file",
      arguments: {
        file_name: "test-file.pdf",
        file_content_base64: "VGhpcyBpcyBhIHRlc3QgZmlsZQ==",
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("test-file.pdf");
  });
});
