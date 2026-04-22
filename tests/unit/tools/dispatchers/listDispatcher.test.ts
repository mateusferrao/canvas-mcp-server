import { describe, it, expect } from "vitest";
import { dispatchCanvasList } from "../../../../src/tools/dispatchers/listDispatcher.js";
import type { ClientContext } from "../../../../src/transport/types.js";
import { buildTestClient } from "../../../helpers/buildClient.js";

function buildContext(): ClientContext {
  return {
    client: buildTestClient(),
    token: "test-token",
    domain: "pucminas.instructure.com",
  };
}

describe("listDispatcher", () => {
  it("dispatcha kind courses", async () => {
    const result = await dispatchCanvasList({ kind: "courses" }, buildContext());
    const text = result.content[0]?.text ?? "";

    expect(text).toContain("Engenharia de Software");
  });

  it("retorna erro claro para kind inválido", async () => {
    const result = await dispatchCanvasList({ kind: "invalid_kind" }, buildContext());
    const text = result.content[0]?.text ?? "";

    expect(text).toContain("INVALID_PARAMS");
    expect(text).toContain("kind");
  });
});
