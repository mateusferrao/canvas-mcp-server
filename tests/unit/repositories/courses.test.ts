import { describe, it, expect } from "vitest";
import { CoursesRepository } from "../../../src/repositories/courses.js";
import { buildTestClient } from "../../helpers/buildClient.js";
import courseList from "../../fixtures/course.list.json" assert { type: "json" };

describe("CoursesRepository.list", () => {
  it("retorna lista paginada de cursos ativos", async () => {
    const repo = new CoursesRepository(buildTestClient());
    const result = await repo.list();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(courseList.length);
      expect(result.value.items[0].id).toBe(101);
      expect(result.value.items[0].name).toBe("Engenharia de Software");
    }
  });
});

describe("CoursesRepository.get", () => {
  it("retorna curso por ID", async () => {
    const repo = new CoursesRepository(buildTestClient());
    const result = await repo.get(101);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(101);
      expect(result.value.course_code).toBe("ES-2024");
    }
  });

  it("retorna NOT_FOUND para ID inexistente", async () => {
    const repo = new CoursesRepository(buildTestClient());
    const result = await repo.get(9999);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});
