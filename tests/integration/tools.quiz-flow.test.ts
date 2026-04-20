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

describe("MCP server — tools listing Phase 3 quiz flow", () => {
  it("expõe 43 tools registradas (30 Phase 1+2 + 8 Phase 3 quiz + 5 Phase 4)", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(43);
  });

  it("inclui todas as tools de quiz flow", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    const expected = [
      "canvas_list_quiz_questions",
      "canvas_start_quiz_attempt",
      "canvas_get_quiz_submission_questions",
      "canvas_answer_quiz_question",
      "canvas_complete_quiz_attempt",
      "canvas_list_quiz_submissions",
      "canvas_get_quiz_submission",
      "canvas_get_quiz_time_left",
    ];
    for (const name of expected) {
      expect(names, `tool ${name} deveria estar registrada`).toContain(name);
    }
  });
});

// ── List Questions ──────────────────────────────────────────────────────────

describe("canvas_list_quiz_questions", () => {
  it("retorna questões do quiz 1001 em markdown", async () => {
    const result = await client.callTool({
      name: "canvas_list_quiz_questions",
      arguments: { course_id: 101, quiz_id: 1001 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("multiple_choice_question");
    expect(text).toContain("essay_question");
    expect(text).toContain("3001");
  });

  it("retorna questões em JSON", async () => {
    const result = await client.callTool({
      name: "canvas_list_quiz_questions",
      arguments: { course_id: 101, quiz_id: 1001, response_format: "json" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.items).toHaveLength(3);
    expect(parsed.items[0].question_type).toBe("multiple_choice_question");
  });
});

// ── Start Attempt ──────────────────────────────────────────────────────────

describe("canvas_start_quiz_attempt", () => {
  it("inicia tentativa com sucesso e retorna validation_token", async () => {
    const result = await client.callTool({
      name: "canvas_start_quiz_attempt",
      arguments: { course_id: 101, quiz_id: 1001 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("TOKEN_ABC123DEF456GHI789");
    expect(text).toContain("untaken");
    expect(text).toContain("2001");
  });

  it("recupera tentativa existente ao receber 409 (quiz 1002)", async () => {
    const result = await client.callTool({
      name: "canvas_start_quiz_attempt",
      arguments: { course_id: 101, quiz_id: 1002 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("TOKEN_EXISTING_RECOVERY_XYZ");
    expect(text).toContain("2002");
  });
});

// ── Get Submission Questions ───────────────────────────────────────────────

describe("canvas_get_quiz_submission_questions", () => {
  it("retorna questões da tentativa 2001", async () => {
    const result = await client.callTool({
      name: "canvas_get_quiz_submission_questions",
      arguments: { quiz_submission_id: 2001 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("3001");
    expect(text).toContain("sem resposta");
  });

  it("retorna questões em JSON", async () => {
    const result = await client.callTool({
      name: "canvas_get_quiz_submission_questions",
      arguments: { quiz_submission_id: 2001, response_format: "json" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.items).toHaveLength(3);
  });
});

// ── Answer Question ────────────────────────────────────────────────────────

describe("canvas_answer_quiz_question", () => {
  it("registra resposta multiple_choice com sucesso", async () => {
    const result = await client.callTool({
      name: "canvas_answer_quiz_question",
      arguments: {
        quiz_submission_id: 2001,
        attempt: 1,
        validation_token: "TOKEN_ABC123DEF456GHI789",
        question_id: 3001,
        question_type: "multiple_choice_question",
        answer: 2,
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("sucesso");
    expect(text).toContain("3001");
  });

  it("registra resposta essay com sucesso", async () => {
    const result = await client.callTool({
      name: "canvas_answer_quiz_question",
      arguments: {
        quiz_submission_id: 2001,
        attempt: 1,
        validation_token: "TOKEN_ABC123DEF456GHI789",
        question_id: 3002,
        question_type: "essay_question",
        answer: "<p>Coesão é a medida de responsabilidade de um módulo...</p>",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("sucesso");
  });

  it("retorna mensagem informativa para text_only_question", async () => {
    const result = await client.callTool({
      name: "canvas_answer_quiz_question",
      arguments: {
        quiz_submission_id: 2001,
        attempt: 1,
        validation_token: "TOKEN_ABC123DEF456GHI789",
        question_id: 3003,
        question_type: "text_only_question",
        answer: undefined,
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("text_only");
  });
});

// ── Complete Attempt ───────────────────────────────────────────────────────

describe("canvas_complete_quiz_attempt", () => {
  it("finaliza tentativa com sucesso e retorna nota", async () => {
    const result = await client.callTool({
      name: "canvas_complete_quiz_attempt",
      arguments: {
        course_id: 101,
        quiz_id: 1001,
        submission_id: 2001,
        attempt: 1,
        validation_token: "TOKEN_ABC123DEF456GHI789",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("concluída");
    expect(text).toContain("complete");
    expect(text).toContain("8");
  });
});

// ── List Submissions ───────────────────────────────────────────────────────

describe("canvas_list_quiz_submissions", () => {
  it("retorna histórico de tentativas em markdown", async () => {
    const result = await client.callTool({
      name: "canvas_list_quiz_submissions",
      arguments: { course_id: 101, quiz_id: 1001 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("2001");
    expect(text).toContain("complete");
  });

  it("retorna tentativas em JSON", async () => {
    const result = await client.callTool({
      name: "canvas_list_quiz_submissions",
      arguments: { course_id: 101, quiz_id: 1001, response_format: "json" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].score).toBe(8);
  });
});

// ── Get Submission ─────────────────────────────────────────────────────────

describe("canvas_get_quiz_submission", () => {
  it("retorna detalhes da tentativa com nota", async () => {
    const result = await client.callTool({
      name: "canvas_get_quiz_submission",
      arguments: { course_id: 101, quiz_id: 1001, submission_id: 2001 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("8");
    expect(text).toContain("complete");
  });

  it("retorna JSON com score correto", async () => {
    const result = await client.callTool({
      name: "canvas_get_quiz_submission",
      arguments: {
        course_id: 101,
        quiz_id: 1001,
        submission_id: 2001,
        response_format: "json",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.score).toBe(8);
    expect(parsed.workflow_state).toBe("complete");
  });
});

// ── Get Time Left ──────────────────────────────────────────────────────────

describe("canvas_get_quiz_time_left", () => {
  it("retorna tempo restante em markdown", async () => {
    const result = await client.callTool({
      name: "canvas_get_quiz_time_left",
      arguments: { course_id: 101, quiz_id: 1001, submission_id: 2001 },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("1234");
    expect(text).toContain("20min");
  });

  it("retorna JSON com time_left correto", async () => {
    const result = await client.callTool({
      name: "canvas_get_quiz_time_left",
      arguments: {
        course_id: 101,
        quiz_id: 1001,
        submission_id: 2001,
        response_format: "json",
      },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.time_left).toBe(1234);
  });
});
