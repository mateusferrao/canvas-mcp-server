import { describe, it, expect } from "vitest";
import { PagesRepository } from "../../../src/repositories/pages.js";
import { buildTestClient } from "../../helpers/buildClient.js";
import pageList from "../../fixtures/page.list.json" assert { type: "json" };
import pageGet from "../../fixtures/page.get.json" assert { type: "json" };

describe("PagesRepository.list", () => {
  it("retorna lista paginada de páginas", async () => {
    const repo = new PagesRepository(buildTestClient());
    const result = await repo.list(101);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(pageList.length);
      expect(result.value.items[0].title).toBe("Introdução ao Curso");
    }
  });

  it("retorna erro 404 para curso inexistente", async () => {
    const repo = new PagesRepository(buildTestClient());
    const result = await repo.list(9999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("PagesRepository.get", () => {
  it("retorna página com body HTML", async () => {
    const repo = new PagesRepository(buildTestClient());
    const result = await repo.get(101, "introducao-ao-curso");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.page_id).toBe(pageGet.page_id);
      expect(result.value.body).toContain("<h2>Bem-vindo!</h2>");
    }
  });

  it("retorna erro 404 para página inexistente", async () => {
    const repo = new PagesRepository(buildTestClient());
    const result = await repo.get(101, "9999");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});
