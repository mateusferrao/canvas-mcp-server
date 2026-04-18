import { describe, it, expect } from "vitest";
import { ProfileRepository } from "../../../src/repositories/profile.js";
import { buildTestClient } from "../../helpers/buildClient.js";

describe("ProfileRepository.getSelf", () => {
  it("retorna perfil do usuário logado", async () => {
    const repo = new ProfileRepository(buildTestClient());
    const result = await repo.getSelf();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(999);
      expect(result.value.name).toBe("João da Silva");
    }
  });
});
