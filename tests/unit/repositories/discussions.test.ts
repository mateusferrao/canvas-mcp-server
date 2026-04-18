import { describe, it, expect } from "vitest";
import { DiscussionsRepository } from "../../../src/repositories/discussions.js";
import { buildTestClient } from "../../helpers/buildClient.js";
import discussionList from "../../fixtures/discussion.list.json" assert { type: "json" };
import discussionEntries from "../../fixtures/discussion.entries.json" assert { type: "json" };

describe("DiscussionsRepository.list", () => {
  it("retorna lista paginada de discussões", async () => {
    const repo = new DiscussionsRepository(buildTestClient());
    const result = await repo.list(101);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(discussionList.length);
      expect(result.value.items[0].id).toBe(601);
    }
  });

  it("retorna erro 404 para curso inexistente", async () => {
    const repo = new DiscussionsRepository(buildTestClient());
    const result = await repo.list(9999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("DiscussionsRepository.get", () => {
  it("retorna tópico de discussão", async () => {
    const repo = new DiscussionsRepository(buildTestClient());
    const result = await repo.get(101, 601);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(601);
      expect(result.value.title).toBe("Dúvidas sobre o Trabalho 1");
    }
  });
});

describe("DiscussionsRepository.listEntries", () => {
  it("retorna entradas de discussão", async () => {
    const repo = new DiscussionsRepository(buildTestClient());
    const result = await repo.listEntries(101, 601);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(discussionEntries.length);
      expect(result.value.items[0].user_name).toBe("Ana Paula");
    }
  });
});

describe("DiscussionsRepository.postEntry", () => {
  it("posta nova entrada em nível superior", async () => {
    const repo = new DiscussionsRepository(buildTestClient());
    const result = await repo.postEntry(101, 601, {
      message: "<p>Meu comentário</p>",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(9001);
    }
  });

  it("posta reply em entrada existente", async () => {
    const repo = new DiscussionsRepository(buildTestClient());
    const result = await repo.postEntry(101, 601, {
      message: "<p>Minha resposta</p>",
      parentEntryId: 701,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(9002);
    }
  });
});
