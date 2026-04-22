import { describe, it, expect } from "vitest";
import { dispatchCanvasGet } from "../../../../src/tools/dispatchers/getDispatcher.js";
import type { ClientContext } from "../../../../src/transport/types.js";
import { buildTestClient } from "../../../helpers/buildClient.js";

function buildContext(): ClientContext {
  return {
    client: buildTestClient(),
    token: "test-token",
    domain: "pucminas.instructure.com",
  };
}

describe("getDispatcher", () => {
  it("dispatcha kind profile", async () => {
    const result = await dispatchCanvasGet({ kind: "profile" }, buildContext());
    const text = result.content[0]?.text ?? "";

    expect(text).toContain("João da Silva");
  });

  it("retorna erro claro para kind inválido", async () => {
    const result = await dispatchCanvasGet({ kind: "invalid_kind" }, buildContext());
    const text = result.content[0]?.text ?? "";

    expect(text).toContain("INVALID_PARAMS");
    expect(text).toContain("kind");
  });
});
