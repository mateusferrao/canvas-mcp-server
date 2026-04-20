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

// ── Tools count ────────────────────────────────────────────────────────────

describe("MCP server — tools listing Phase 2", () => {
  it("expõe 43 tools registradas (13 Phase 1 + 17 Phase 2 + 8 Phase 3 + 5 Phase 4)", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(43);
  });

  it("inclui todas as tools Phase 2", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    const expected = [
      "canvas_list_modules",
      "canvas_list_module_items",
      "canvas_mark_module_item_done",
      "canvas_list_pages",
      "canvas_get_page_content",
      "canvas_list_discussions",
      "canvas_get_discussion",
      "canvas_post_discussion_entry",
      "canvas_list_conversations",
      "canvas_get_conversation",
      "canvas_send_message",
      "canvas_list_planner_notes",
      "canvas_manage_planner_note",
      "canvas_get_course_grades",
      "canvas_list_quizzes",
      "canvas_get_quiz",
      "canvas_upload_file",
    ];
    for (const name of expected) {
      expect(names, `tool ${name} deveria estar registrada`).toContain(name);
    }
  });
});

// ── Modules ────────────────────────────────────────────────────────────────

describe("canvas_list_modules", () => {
  it("retorna módulos do curso 101 em markdown", async () => {
    const result = await client.callTool({
      name: "canvas_list_modules",
      arguments: { course_id: 101 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Módulo 1: Introdução");
    expect(text).toContain("Módulo 2: Fundamentos");
  });

  it("retorna módulos em JSON", async () => {
    const result = await client.callTool({
      name: "canvas_list_modules",
      arguments: { course_id: 101, response_format: "json" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.items).toHaveLength(2);
  });
});

describe("canvas_list_module_items", () => {
  it("retorna itens do módulo 301", async () => {
    const result = await client.callTool({
      name: "canvas_list_module_items",
      arguments: { course_id: 101, module_id: 301 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Apresentação do Curso");
    expect(text).toContain("Atividade 1");
  });
});

describe("canvas_mark_module_item_done", () => {
  it("marca item como concluído com sucesso", async () => {
    const result = await client.callTool({
      name: "canvas_mark_module_item_done",
      arguments: { course_id: 101, module_id: 301, item_id: 1001 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("concluído");
  });
});

// ── Pages ──────────────────────────────────────────────────────────────────

describe("canvas_list_pages", () => {
  it("retorna páginas do curso 101", async () => {
    const result = await client.callTool({
      name: "canvas_list_pages",
      arguments: { course_id: 101 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Introdução ao Curso");
    expect(text).toContain("Cronograma");
  });
});

describe("canvas_get_page_content", () => {
  it("retorna conteúdo convertido para markdown", async () => {
    const result = await client.callTool({
      name: "canvas_get_page_content",
      arguments: { course_id: 101, page_url_or_id: "introducao-ao-curso" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Introdução ao Curso");
    expect(text).toContain("Bem-vindo");
  });

  it("retorna HTML original no modo json", async () => {
    const result = await client.callTool({
      name: "canvas_get_page_content",
      arguments: {
        course_id: 101,
        page_url_or_id: "introducao-ao-curso",
        response_format: "json",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.body).toContain("<h2>Bem-vindo!</h2>");
  });
});

// ── Discussions ────────────────────────────────────────────────────────────

describe("canvas_list_discussions", () => {
  it("retorna discussões do curso 101", async () => {
    const result = await client.callTool({
      name: "canvas_list_discussions",
      arguments: { course_id: 101 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Dúvidas sobre o Trabalho 1");
    expect(text).toContain("Fórum Geral");
  });
});

describe("canvas_get_discussion", () => {
  it("retorna tópico com mensagem convertida para markdown", async () => {
    const result = await client.callTool({
      name: "canvas_get_discussion",
      arguments: { course_id: 101, topic_id: 601 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Dúvidas sobre o Trabalho 1");
  });
});

describe("canvas_post_discussion_entry", () => {
  it("posta entrada com sucesso", async () => {
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

  it("posta reply em entrada existente", async () => {
    const result = await client.callTool({
      name: "canvas_post_discussion_entry",
      arguments: {
        course_id: 101,
        topic_id: 601,
        message: "<p>Minha resposta</p>",
        parent_entry_id: 701,
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("sucesso");
  });
});

// ── Conversations ──────────────────────────────────────────────────────────

describe("canvas_list_conversations", () => {
  it("retorna conversas do inbox", async () => {
    const result = await client.callTool({
      name: "canvas_list_conversations",
      arguments: {},
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Dúvida sobre nota");
  });
});

describe("canvas_get_conversation", () => {
  it("retorna conversa com histórico", async () => {
    const result = await client.callTool({
      name: "canvas_get_conversation",
      arguments: { conversation_id: 801 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Dúvida sobre nota");
  });
});

describe("canvas_send_message", () => {
  it("cria nova conversa (mode=new)", async () => {
    const result = await client.callTool({
      name: "canvas_send_message",
      arguments: {
        mode: "new",
        recipients: ["1"],
        body: "Olá professor!",
        subject: "Dúvida sobre nota",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("sucesso");
  });

  it("envia reply a conversa existente (mode=reply)", async () => {
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
});

// ── Planner ────────────────────────────────────────────────────────────────

describe("canvas_list_planner_notes", () => {
  it("retorna notas do planejador", async () => {
    const result = await client.callTool({
      name: "canvas_list_planner_notes",
      arguments: {},
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Estudar para P2");
    expect(text).toContain("Preparar apresentação TCC");
  });
});

describe("canvas_manage_planner_note", () => {
  it("cria nova nota (action=create)", async () => {
    const result = await client.callTool({
      name: "canvas_manage_planner_note",
      arguments: {
        action: "create",
        title: "Nova nota",
        todo_date: "2024-07-01",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    // MSW mock returns fixture with id=902; title comes from fixture
    expect(text).toContain("902");
  });

  it("atualiza nota (action=update)", async () => {
    const result = await client.callTool({
      name: "canvas_manage_planner_note",
      arguments: {
        action: "update",
        id: 901,
        title: "Nota atualizada",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Nota atualizada");
  });

  it("exclui nota (action=delete)", async () => {
    const result = await client.callTool({
      name: "canvas_manage_planner_note",
      arguments: {
        action: "delete",
        id: 901,
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("excluída");
  });
});

// ── Grades ─────────────────────────────────────────────────────────────────

describe("canvas_get_course_grades", () => {
  it("retorna notas do curso 101 em markdown", async () => {
    const result = await client.callTool({
      name: "canvas_get_course_grades",
      arguments: { course_id: 101 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("87.5");
    expect(text).toContain("A");
  });

  it("retorna notas em JSON", async () => {
    const result = await client.callTool({
      name: "canvas_get_course_grades",
      arguments: { course_id: 101, response_format: "json" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.grades.current_score).toBe(87.5);
  });
});

// ── Quizzes ────────────────────────────────────────────────────────────────

describe("canvas_list_quizzes", () => {
  it("retorna quizzes do curso 101", async () => {
    const result = await client.callTool({
      name: "canvas_list_quizzes",
      arguments: { course_id: 101 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Quiz 1: Conceitos Básicos");
    expect(text).toContain("Quiz 2: Módulos Avançados");
  });
});

describe("canvas_get_quiz", () => {
  it("retorna detalhes do quiz 1001", async () => {
    const result = await client.callTool({
      name: "canvas_get_quiz",
      arguments: { course_id: 101, quiz_id: 1001 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Quiz 1: Conceitos Básicos");
    expect(text).toContain("30 minutos");
    expect(text).toContain("10");
  });
});
