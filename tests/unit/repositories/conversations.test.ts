import { describe, it, expect } from "vitest";
import { ConversationsRepository } from "../../../src/repositories/conversations.js";
import { buildTestClient } from "../../helpers/buildClient.js";
import conversationList from "../../fixtures/conversation.list.json" assert { type: "json" };
import conversationGet from "../../fixtures/conversation.get.json" assert { type: "json" };

describe("ConversationsRepository.list", () => {
  it("retorna lista paginada de conversas", async () => {
    const repo = new ConversationsRepository(buildTestClient());
    const result = await repo.list();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(conversationList.length);
      expect(result.value.items[0].id).toBe(801);
    }
  });
});

describe("ConversationsRepository.get", () => {
  it("retorna conversa com mensagens", async () => {
    const repo = new ConversationsRepository(buildTestClient());
    const result = await repo.get(801);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(801);
      expect(result.value.messages).toHaveLength(3);
    }
  });

  it("retorna erro 404 para conversa inexistente", async () => {
    const repo = new ConversationsRepository(buildTestClient());
    const result = await repo.get(9999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("ConversationsRepository.create", () => {
  it("cria nova conversa", async () => {
    const repo = new ConversationsRepository(buildTestClient());
    const result = await repo.create({
      recipients: ["1"],
      body: "Olá professor!",
      subject: "Dúvida sobre nota",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value[0].id).toBe(conversationGet.id);
    }
  });
});

describe("ConversationsRepository.addMessage", () => {
  it("adiciona mensagem a conversa existente", async () => {
    const repo = new ConversationsRepository(buildTestClient());
    const result = await repo.addMessage(801, { body: "Obrigado!" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(801);
    }
  });
});
