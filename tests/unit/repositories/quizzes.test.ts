import { describe, it, expect } from "vitest";
import { QuizzesRepository } from "../../../src/repositories/quizzes.js";
import { buildTestClient } from "../../helpers/buildClient.js";
import quizList from "../../fixtures/quiz.list.json" assert { type: "json" };

describe("QuizzesRepository.list", () => {
  it("retorna lista paginada de quizzes", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.list(101);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(quizList.length);
      expect(result.value.items[0].id).toBe(1001);
      expect(result.value.items[0].title).toBe("Quiz 1: Conceitos Básicos");
    }
  });

  it("retorna erro 404 para curso inexistente", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.list(9999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("QuizzesRepository.get", () => {
  it("retorna quiz por ID", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.get(101, 1001);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(1001);
      expect(result.value.question_count).toBe(10);
      expect(result.value.time_limit).toBe(30);
    }
  });

  it("retorna erro 404 para quiz inexistente", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.get(101, 9999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});

// ── Phase 3: Quiz-taking flow ─────────────────────────────────────────────────

describe("QuizzesRepository.listQuestions", () => {
  it("retorna questões do quiz 1001", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.listQuestions(101, 1001);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(3);
      expect(result.value.items[0].id).toBe(3001);
      expect(result.value.items[0].question_type).toBe("multiple_choice_question");
      expect(result.value.items[1].question_type).toBe("essay_question");
    }
  });

  it("retorna erro 404 para quiz inexistente", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.listQuestions(101, 9999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("QuizzesRepository.startAttempt", () => {
  it("inicia tentativa com sucesso para quiz 1001", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.startAttempt(101, 1001);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(2001);
      expect(result.value.attempt).toBe(1);
      expect(result.value.workflow_state).toBe("untaken");
      expect(result.value.validation_token).toBe("TOKEN_ABC123DEF456GHI789");
    }
  });

  it("recupera tentativa existente ao receber 409 (quiz 1002)", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.startAttempt(101, 1002);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(2002);
      expect(result.value.validation_token).toBe("TOKEN_EXISTING_RECOVERY_XYZ");
    }
  });
});

describe("QuizzesRepository.getSubmissionQuestions", () => {
  it("retorna questões da tentativa 2001", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.getSubmissionQuestions(2001);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(3);
      expect(result.value[0].id).toBe(3001);
      expect(result.value[0].flagged).toBe(false);
    }
  });

  it("retorna erro 404 para tentativa inexistente", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.getSubmissionQuestions(9999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("QuizzesRepository.answerQuestion", () => {
  it("registra resposta com sucesso", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.answerQuestion(2001, {
      attempt: 1,
      validationToken: "TOKEN_ABC123DEF456GHI789",
      questionId: 3001,
      answer: 2,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(3001);
      expect(result.value[0].answer).toBe(2);
    }
  });
});

describe("QuizzesRepository.completeAttempt", () => {
  it("completa tentativa com sucesso", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.completeAttempt(101, 1001, 2001, {
      attempt: 1,
      validationToken: "TOKEN_ABC123DEF456GHI789",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.workflow_state).toBe("complete");
      expect(result.value.score).toBe(8.0);
    }
  });
});

describe("QuizzesRepository.listSubmissions", () => {
  it("retorna lista de tentativas do quiz 1001", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.listSubmissions(101, 1001);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(2001);
      expect(result.value[0].score).toBe(8.0);
    }
  });
});

describe("QuizzesRepository.getSubmission", () => {
  it("retorna tentativa específica", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.getSubmission(101, 1001, 2001);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(2001);
      expect(result.value.score).toBe(8.0);
      expect(result.value.workflow_state).toBe("complete");
    }
  });

  it("retorna erro 404 para tentativa inexistente", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.getSubmission(101, 1001, 9999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("QuizzesRepository.getTimeLeft", () => {
  it("retorna tempo restante da tentativa", async () => {
    const repo = new QuizzesRepository(buildTestClient());
    const result = await repo.getTimeLeft(101, 1001, 2001);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.time_left).toBe(1234);
      expect(result.value.end_at).toBe("2024-06-05T10:30:00Z");
    }
  });
});
