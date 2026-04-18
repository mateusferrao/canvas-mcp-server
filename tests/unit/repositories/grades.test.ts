import { describe, it, expect } from "vitest";
import { GradesRepository } from "../../../src/repositories/grades.js";
import { buildTestClient } from "../../helpers/buildClient.js";

describe("GradesRepository.getCourseGrades", () => {
  it("retorna enrollment com notas do curso 101", async () => {
    const repo = new GradesRepository(buildTestClient());
    const result = await repo.getCourseGrades(101);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.course_id).toBe(101);
      expect(result.value.grades?.current_grade).toBe("A");
      expect(result.value.grades?.current_score).toBe(87.5);
    }
  });

  it("retorna erro 404 para curso inexistente", async () => {
    const repo = new GradesRepository(buildTestClient());
    const result = await repo.getCourseGrades(9999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});
