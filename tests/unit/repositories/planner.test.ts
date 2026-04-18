import { describe, it, expect } from "vitest";
import { PlannerRepository } from "../../../src/repositories/planner.js";
import { buildTestClient } from "../../helpers/buildClient.js";
import plannerList from "../../fixtures/planner.list.json" assert { type: "json" };
import plannerGet from "../../fixtures/planner.get.json" assert { type: "json" };

describe("PlannerRepository.list", () => {
  it("retorna lista paginada de notas", async () => {
    const repo = new PlannerRepository(buildTestClient());
    const result = await repo.list();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(plannerList.length);
      expect(result.value.items[0].title).toBe("Estudar para P2");
    }
  });
});

describe("PlannerRepository.get", () => {
  it("retorna nota por ID", async () => {
    const repo = new PlannerRepository(buildTestClient());
    const result = await repo.get(901);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(plannerGet.id);
      expect(result.value.title).toBe("Estudar para P2");
    }
  });

  it("retorna erro 404 para nota inexistente", async () => {
    const repo = new PlannerRepository(buildTestClient());
    const result = await repo.get(9999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("PlannerRepository.create", () => {
  it("cria nova nota", async () => {
    const repo = new PlannerRepository(buildTestClient());
    const result = await repo.create({
      title: "Nova nota",
      todo_date: "2024-07-01",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(902);
    }
  });
});

describe("PlannerRepository.update", () => {
  it("atualiza nota existente", async () => {
    const repo = new PlannerRepository(buildTestClient());
    const result = await repo.update(901, { title: "Nota atualizada" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Nota atualizada");
    }
  });
});

describe("PlannerRepository.delete", () => {
  it("exclui nota existente", async () => {
    const repo = new PlannerRepository(buildTestClient());
    const result = await repo.delete(901);
    expect(result.ok).toBe(true);
  });
});
