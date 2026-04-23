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

const listKindCases: Array<{ kind: string; args: Record<string, unknown> }> = [
  { kind: "courses", args: { kind: "courses" } },
  { kind: "assignments", args: { kind: "assignments", course_id: 101 } },
  { kind: "todo", args: { kind: "todo" } },
  { kind: "modules", args: { kind: "modules", course_id: 101 } },
  { kind: "module_items", args: { kind: "module_items", course_id: 101, module_id: 301 } },
  { kind: "pages", args: { kind: "pages", course_id: 101 } },
  { kind: "discussions", args: { kind: "discussions", course_id: 101 } },
  { kind: "conversations", args: { kind: "conversations" } },
  { kind: "planner_notes", args: { kind: "planner_notes" } },
  { kind: "quizzes", args: { kind: "quizzes", course_id: 101 } },
  { kind: "quiz_questions", args: { kind: "quiz_questions", course_id: 101, quiz_id: 1001 } },
  { kind: "quiz_submissions", args: { kind: "quiz_submissions", course_id: 101, quiz_id: 1001 } },
  { kind: "submissions", args: { kind: "submissions", course_id: 101 } },
  { kind: "announcements", args: { kind: "announcements", context_codes: ["course_101"] } },
  { kind: "calendar_events", args: { kind: "calendar_events", context_codes: ["course_101"] } },
  { kind: "upcoming_events", args: { kind: "upcoming_events" } },
  { kind: "missing_submissions", args: { kind: "missing_submissions" } },
  { kind: "files", args: { kind: "files", course_id: 101 } },
];

const getKindCases: Array<{ kind: string; args: Record<string, unknown> }> = [
  { kind: "profile", args: { kind: "profile" } },
  { kind: "course", args: { kind: "course", course_id: 101 } },
  { kind: "assignment", args: { kind: "assignment", course_id: 101, assignment_id: 201 } },
  { kind: "submission", args: { kind: "submission", course_id: 101, assignment_id: 201 } },
  { kind: "page_content", args: { kind: "page_content", course_id: 101, page_url_or_id: "introducao-ao-curso" } },
  { kind: "discussion", args: { kind: "discussion", course_id: 101, topic_id: 601 } },
  { kind: "conversation", args: { kind: "conversation", conversation_id: 801 } },
  { kind: "quiz", args: { kind: "quiz", course_id: 101, quiz_id: 1001 } },
  { kind: "quiz_submission", args: { kind: "quiz_submission", course_id: 101, quiz_id: 1001, submission_id: 2001 } },
  { kind: "quiz_submission_questions", args: { kind: "quiz_submission_questions", quiz_submission_id: 2001 } },
  { kind: "quiz_time_left", args: { kind: "quiz_time_left", course_id: 101, quiz_id: 1001, submission_id: 2001 } },
  { kind: "course_grades", args: { kind: "course_grades", course_id: 101 } },
  { kind: "file", args: { kind: "file", file_id: 5001 } },
];

describe("canvas_list kinds coverage", () => {
  for (const testCase of listKindCases) {
    it(`dispatcha kind=${testCase.kind}`, async () => {
      const result = await client.callTool({
        name: "canvas_list",
        arguments: testCase.args,
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain("Erro [INVALID_PARAMS]");
    });
  }
});

describe("canvas_get kinds coverage", () => {
  for (const testCase of getKindCases) {
    it(`dispatcha kind=${testCase.kind}`, async () => {
      const result = await client.callTool({
        name: "canvas_get",
        arguments: testCase.args,
      });

      const text = (result.content as Array<{ type: string; text: string }>)[0].text;
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain("Erro [INVALID_PARAMS]");
    });
  }
});

describe("consolidated action tools coverage", () => {
  it("canvas_document actions", async () => {
    const download = await client.callTool({
      name: "canvas_document",
      arguments: { action: "download", file_id: 5002 },
    });
    const downloadText = (download.content as Array<{ type: string; text: string }>)[0].text;
    expect(downloadText).toContain("Base64");

    const extract = await client.callTool({
      name: "canvas_document",
      arguments: { action: "extract", file_id: 5002 },
    });
    const extractText = (extract.content as Array<{ type: string; text: string }>)[0].text;
    expect(extractText).toContain("Texto Extraído");

    const resolve = await client.callTool({
      name: "canvas_document",
      arguments: { action: "resolve_task_files", kind: "assignment", course_id: 101, id: 201 },
    });
    const resolveText = (resolve.content as Array<{ type: string; text: string }>)[0].text;
    expect(resolveText).toContain("Total de arquivos");
  });

  it("canvas_quiz_attempt actions", async () => {
    const start = await client.callTool({
      name: "canvas_quiz_attempt",
      arguments: { action: "start", course_id: 101, quiz_id: 1001 },
    });
    const startText = (start.content as Array<{ type: string; text: string }>)[0].text;
    expect(startText).toContain("validation_token");

    const answer = await client.callTool({
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
    const answerText = (answer.content as Array<{ type: string; text: string }>)[0].text;
    expect(answerText).toContain("sucesso");

    const complete = await client.callTool({
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
    const completeText = (complete.content as Array<{ type: string; text: string }>)[0].text;
    expect(completeText).toContain("concluída");
  });
});
