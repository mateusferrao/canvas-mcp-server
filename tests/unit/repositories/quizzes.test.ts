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
