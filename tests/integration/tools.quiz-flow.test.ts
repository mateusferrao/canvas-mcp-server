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

describe("canvas_list quiz kinds", () => {
  it("quiz_questions", async () => {
    const result = await client.callTool({
      name: "canvas_list",
      arguments: { kind: "quiz_questions", course_id: 101, quiz_id: 1001 },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("multiple_choice_question");
    expect(text).toContain("essay_question");
  });

  it("quiz_submissions", async () => {
    const result = await client.callTool({
      name: "canvas_list",
      arguments: { kind: "quiz_submissions", course_id: 101, quiz_id: 1001 },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Tentativa");
  });
});

describe("canvas_quiz_attempt", () => {
  it("start", async () => {
    const result = await client.callTool({
      name: "canvas_quiz_attempt",
      arguments: { action: "start", course_id: 101, quiz_id: 1001 },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("TOKEN_ABC123DEF456GHI789");
    expect(text).toContain("2001");
  });

  it("answer", async () => {
    const result = await client.callTool({
      name: "canvas_quiz_attempt",
      arguments: {
        action: "answer",
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

  it("complete", async () => {
    const result = await client.callTool({
      name: "canvas_quiz_attempt",
      arguments: {
        action: "complete",
        course_id: 101,
        quiz_id: 1001,
        submission_id: 2001,
        attempt: 1,
        validation_token: "TOKEN_ABC123DEF456GHI789",
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("concluída");
  });
});

describe("canvas_get quiz kinds", () => {
  it("quiz_submission_questions", async () => {
    const result = await client.callTool({
      name: "canvas_get",
      arguments: { kind: "quiz_submission_questions", quiz_submission_id: 2001 },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Questão ID");
  });

  it("quiz_submission", async () => {
    const result = await client.callTool({
      name: "canvas_get",
      arguments: {
        kind: "quiz_submission",
        course_id: 101,
        quiz_id: 1001,
        submission_id: 2001,
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Tentativa");
  });

  it("quiz_time_left", async () => {
    const result = await client.callTool({
      name: "canvas_get",
      arguments: {
        kind: "quiz_time_left",
        course_id: 101,
        quiz_id: 1001,
        submission_id: 2001,
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("1234");
  });
});
