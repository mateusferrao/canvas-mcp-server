import { describe, it, expect } from "vitest";
import { ModulesRepository } from "../../../src/repositories/modules.js";
import { buildTestClient } from "../../helpers/buildClient.js";
import moduleList from "../../fixtures/module.list.json" assert { type: "json" };
import moduleItems from "../../fixtures/module.items.json" assert { type: "json" };

describe("ModulesRepository.list", () => {
  it("retorna lista paginada de módulos", async () => {
    const repo = new ModulesRepository(buildTestClient());
    const result = await repo.list(101);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(moduleList.length);
      expect(result.value.items[0].id).toBe(301);
      expect(result.value.items[0].name).toBe("Módulo 1: Introdução");
    }
  });

  it("retorna erro 401 para token inválido", async () => {
    const repo = new ModulesRepository(buildTestClient());
    const result = await repo.list(401);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("retorna erro 404 para curso inexistente", async () => {
    const repo = new ModulesRepository(buildTestClient());
    const result = await repo.list(9999);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("ModulesRepository.listItems", () => {
  it("retorna itens do módulo", async () => {
    const repo = new ModulesRepository(buildTestClient());
    const result = await repo.listItems(101, 301);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(moduleItems.length);
      expect(result.value.items[0].id).toBe(1001);
      expect(result.value.items[0].type).toBe("Page");
    }
  });
});

describe("ModulesRepository.markItemDone", () => {
  it("marca item como concluído com sucesso", async () => {
    const repo = new ModulesRepository(buildTestClient());
    const result = await repo.markItemDone(101, 301, 1001);
    expect(result.ok).toBe(true);
  });

  it("retorna erro 404 para item inexistente", async () => {
    const repo = new ModulesRepository(buildTestClient());
    const result = await repo.markItemDone(101, 301, 9999);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});
