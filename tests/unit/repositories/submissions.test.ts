import { describe, it, expect } from "vitest";
import { SubmissionsRepository } from "../../../src/repositories/submissions.js";
import { buildTestClient } from "../../helpers/buildClient.js";

describe("SubmissionsRepository.list", () => {
  it("retorna lista de submissões do aluno", async () => {
    const repo = new SubmissionsRepository(buildTestClient());
    const result = await repo.list({ courseId: 101 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items.length).toBeGreaterThan(0);
    }
  });
});

describe("SubmissionsRepository.get", () => {
  it("retorna submissão existente", async () => {
    const repo = new SubmissionsRepository(buildTestClient());
    const result = await repo.get(101, 201);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(301);
      expect(result.value.grade).toBe("9,50");
    }
  });
});

describe("SubmissionsRepository.submit", () => {
  it("submete tarefa com texto", async () => {
    const repo = new SubmissionsRepository(buildTestClient());
    const result = await repo.submit({
      courseId: 101,
      assignmentId: 201,
      submissionType: "online_text_entry",
      body: "<p>Minha resposta</p>",
    });
    expect(result.ok).toBe(true);
  });

  it("retorna erro INVALID_PARAMS sem body para online_text_entry", async () => {
    const repo = new SubmissionsRepository(buildTestClient());
    const result = await repo.submit({
      courseId: 101,
      assignmentId: 201,
      submissionType: "online_text_entry",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PARAMS");
    }
  });

  it("retorna erro INVALID_PARAMS para URL sem http/https", async () => {
    const repo = new SubmissionsRepository(buildTestClient());
    const result = await repo.submit({
      courseId: 101,
      assignmentId: 201,
      submissionType: "online_url",
      url: "ftp://bad-url.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PARAMS");
    }
  });

  it("retorna erro INVALID_PARAMS sem url para online_url", async () => {
    const repo = new SubmissionsRepository(buildTestClient());
    const result = await repo.submit({
      courseId: 101,
      assignmentId: 201,
      submissionType: "online_url",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PARAMS");
    }
  });
});
