import { describe, it, expect } from "vitest";
import { createCanvasClient } from "../../../src/services/canvasClient.js";
import { buildTestClient } from "../../helpers/buildClient.js";
import courseList from "../../fixtures/course.list.json" assert { type: "json" };
import profileGet from "../../fixtures/profile.get.json" assert { type: "json" };

describe("createCanvasClient — validação de domínio", () => {
  it("lança erro para domínio inválido", () => {
    expect(() =>
      createCanvasClient({ token: "tok", domain: "evil.com" })
    ).toThrow(/Domínio Canvas inválido/);
  });

  it("aceita domínio válido *.instructure.com", () => {
    expect(() =>
      createCanvasClient({ token: "tok", domain: "pucminas.instructure.com" })
    ).not.toThrow();
  });
});

describe("ICanvasClient.get", () => {
  it("retorna dados do usuário (GET /users/self)", async () => {
    const client = buildTestClient();
    const result = await client.get("/users/self");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ id: profileGet.id, name: profileGet.name });
    }
  });

  it("retorna erro NOT_FOUND para curso inexistente (404)", async () => {
    const client = buildTestClient();
    const result = await client.get("/courses/9999");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("retorna erro UNAUTHORIZED para status 401", async () => {
    const client = buildTestClient();
    const result = await client.get("/courses/401");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("retorna erro RATE_LIMITED para status 429", async () => {
    const client = buildTestClient();
    const result = await client.get("/courses/429");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("RATE_LIMITED");
    }
  });
});

describe("ICanvasClient.getPaginated", () => {
  it("retorna lista paginada de cursos", async () => {
    const client = buildTestClient();
    const result = await client.getPaginated("/courses");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value.items)).toBe(true);
      expect(result.value.items).toHaveLength(courseList.length);
      expect(result.value.hasMore).toBe(false);
    }
  });
});
